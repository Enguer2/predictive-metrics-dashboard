"""
main.py — WATCHMAN_OS Backend v3.2.0
──────────────────────────────────────
Architecture :
  POST /api/report/{node_id}     ← reçoit les données brutes des agents
  GET  /api/nodes                ← liste les nodes actifs (Plug & Play)
  GET  /api/nodes/status         ← dernier snapshot de chaque node
  GET  /api/scenarios            ← [NEW] liste les CSV du dossier /dataset
  POST /api/nodes/deploy         ← provisionne un node simulé à la volée
  DELETE /api/nodes/{node_id}    ← killswitch : purge DB + mémoire d'un node
  GET  /stats/{node_id}          ← polling frontend (mode legacy/simulation)
  GET  /history/{node_id}        ← 50 derniers points d'un node
  GET  /                         ← healthcheck
"""

from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, Column, Float, Boolean, Integer, DateTime, String, func
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import OperationalError
import joblib
import numpy as np
import os
import csv as csv_module
import datetime
import time
import subprocess
import sys
from collections import deque
from typing import Optional
import asyncio

# ─────────────────────────────────────────────
# DATASET DIRECTORY
# Chemin absolu vers le dossier /dataset à la racine du repo.
# On remonte d'un niveau par rapport à main.py pour trouver la racine.
# ─────────────────────────────────────────────
DATASET_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "dataset")
)
# Fallback : si main.py est déjà à la racine (docker workdir = /)
if not os.path.isdir(DATASET_DIR):
    DATASET_DIR = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "dataset")
    )
print(f"📂 Dataset directory: {DATASET_DIR} ({'found' if os.path.isdir(DATASET_DIR) else 'NOT FOUND — will return empty list'})")

# ─────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://user:password@dashboard-db:5432/dashboard_ops",
)
engine       = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base         = declarative_base()

# ─────────────────────────────────────────────
# DATABASE MODEL
# ─────────────────────────────────────────────
class MetricLog(Base):
    __tablename__ = "metrics_history"
    id            = Column(Integer, primary_key=True, index=True)
    session_id    = Column(String, index=True, nullable=False, default="anonymous") # <-- NOUVEAU
    node_id       = Column(String,  index=True, nullable=False)
    cpu           = Column(Float,   nullable=False)
    ram           = Column(Float,   nullable=False)
    network       = Column(Float,   default=0.0)
    cpu_delta     = Column(Float,   default=0.0)
    ram_delta     = Column(Float,   default=0.0)
    combined_load = Column(Float,   default=0.0)
    is_anomaly    = Column(Boolean, default=False)
    ai_risk_score = Column(Integer, default=0)
    alert_level   = Column(String,  default="OK")
    timestamp     = Column(DateTime, default=datetime.datetime.utcnow)

def get_session(x_session_id: str = Header(None)):
    if not x_session_id:
        return "anonymous" # Fallback
    return x_session_id

# ─────────────────────────────────────────────
# DB INIT WITH RETRY
# ─────────────────────────────────────────────
def init_db() -> bool:
    for attempt in range(10, 0, -1):
        try:
            Base.metadata.create_all(bind=engine)
            print("✅ Base de données connectée et tables créées.")
            return True
        except OperationalError:
            print(f"⏳ En attente de la DB... ({attempt - 1} tentatives restantes)")
            time.sleep(3)
    return False

init_db()

# ─────────────────────────────────────────────
# AI MODEL
# ─────────────────────────────────────────────
try:
    model        = joblib.load("model.pkl")
    scaler       = joblib.load("scaler.pkl")
    FEATURE_COLS = joblib.load("feature_cols.pkl")
    THRESHOLDS   = joblib.load("thresholds.pkl")
    print(f"✅ IA chargée — features : {FEATURE_COLS}")
except Exception as e:
    print(f"❌ Erreur chargement IA : {e}")
    model, scaler, FEATURE_COLS, THRESHOLDS = None, None, None, None

# ─────────────────────────────────────────────
# IN-MEMORY STATE  (sliding windows, per node)
# ─────────────────────────────────────────────
WINDOW_SIZE = 5
_windows: dict[str, deque] = {}   # {node_id: deque[(cpu, ram, net)]}

# Registry des processus agents déployés localement {node_id: subprocess.Popen}
_deployed_processes: dict[str, subprocess.Popen] = {}

CPU_DANGER   = 85.0
RAM_DANGER   = 85.0
RAM_CRITICAL = 95.0

# ─────────────────────────────────────────────
# FEATURE ENGINEERING
# ─────────────────────────────────────────────
def compute_features(node_id: str, cpu: float, ram: float, network: float) -> dict:
    """
    Construit le vecteur enrichi identique à build_features() de train_model.py.
    Chaque node a sa propre fenêtre glissante → pas de contamination entre nodes.
    """
    if node_id not in _windows:
        _windows[node_id] = deque(maxlen=WINDOW_SIZE)

    window = _windows[node_id]
    window.append((cpu, ram, network))

    if len(window) >= 2:
        prev_cpu, prev_ram, prev_net = window[-2]
        cpu_delta = cpu - prev_cpu
        ram_delta = ram - prev_ram
        net_delta = network - prev_net
    else:
        cpu_delta = ram_delta = net_delta = 0.0

    return {
        "cpu":           cpu,
        "ram":           ram,
        "network":       network,
        "cpu_delta":     cpu_delta,
        "ram_delta":     ram_delta,
        "net_delta":     net_delta,
        "cpu_pressure":  max(0.0, cpu - CPU_DANGER),
        "ram_pressure":  max(0.0, ram - RAM_DANGER),
        "ram_critical":  max(0.0, ram - RAM_CRITICAL),
        "combined_load": cpu * 0.45 + ram * 0.45 + network * 0.10,
        "cpu_ram_ratio": cpu / (ram + 1e-6),
    }


def get_alert_level(risk_score: int, cpu_delta: float, ram_delta: float) -> str:
    rising_fast = cpu_delta > 8 or ram_delta > 6
    if risk_score > 70 or (risk_score > 50 and rising_fast):
        return "CRITICAL"
    if risk_score > 35 or rising_fast:
        return "WARNING"
    return "OK"


# ─────────────────────────────────────────────
# CORE INFERENCE + STORAGE
# Called both from POST /api/report and GET /stats
# ─────────────────────────────────────────────
# Remplacer process_metrics
def process_metrics(session_id: str, node_id: str, cpu: float, ram: float, network: float) -> dict:
    internal_id = f"{session_id}_{node_id}" # <-- Clé unique par utilisateur
    features    = compute_features(internal_id, cpu, ram, network)
    
    is_anomaly      = False
    prediction_code = 1
    ai_risk_score   = 0
    alert_level     = "OK"
    raw_score       = 0.0

    if model and scaler and FEATURE_COLS:
        try:
            fv            = np.array([[features[c] for c in FEATURE_COLS]])
            sv            = scaler.transform(fv)
            raw_score     = model.decision_function(sv)[0]
            risk_float    = (0.15 - raw_score) * 400
            ai_risk_score = int(max(0, min(100, risk_float)))
            alert_level   = get_alert_level(ai_risk_score, features["cpu_delta"], features["ram_delta"])
            is_anomaly    = alert_level != "OK"
            prediction_code = -1 if is_anomaly else 1
        except Exception as e:
            print(f"⚠️ Erreur prédiction IA [{internal_id}]: {e}")

    try:
        db = SessionLocal()
        db.add(MetricLog(
            session_id    = session_id, # <-- SAUVEGARDE CRUCIALE
            node_id       = node_id,
            cpu           = cpu,
            ram           = ram,
            network       = network,
            cpu_delta     = features["cpu_delta"],
            ram_delta     = features["ram_delta"],
            combined_load = features["combined_load"],
            is_anomaly    = is_anomaly,
            ai_risk_score = ai_risk_score,
            alert_level   = alert_level,
        ))
        db.commit()
    except Exception as e:
        print(f"⚠️ Erreur sauvegarde DB [{internal_id}]: {e}")
    finally:
        db.close()

    return {
        "node_id": node_id,
        "is_anomaly": is_anomaly,
        "ai_risk_score": ai_risk_score,
        "alert_level": alert_level,
    }


# ─────────────────────────────────────────────
# DYNAMIC NODE REGISTRY  (Plug & Play)
# ─────────────────────────────────────────────
def get_active_nodes_from_db(session_id: str) -> list[str]:
    """Retourne tous les node_id distincts de LA SESSION ACTUELLE."""
    try:
        db   = SessionLocal()
        rows = db.query(MetricLog.node_id).filter(MetricLog.session_id == session_id).distinct().all()
        return [r[0] for r in rows]
    except Exception:
        return []
    finally:
        db.close()

def get_node_meta(node_id: str) -> dict:
    """Métadonnées statiques. Pour un vrai agent, elles pourraient être POSTées à l'enregistrement."""
    STATIC_META = {
        "cluster_01": {"label": "Cluster Alpha — Paris",  "lat": 48.85, "lon":  2.35},
        "cluster_02": {"label": "Cluster Beta — London",  "lat": 51.51, "lon": -0.13},
        "cluster_03": {"label": "Cluster Gamma — NYC",    "lat": 40.71, "lon":-74.00},
        "cluster_04": {"label": "Cluster Delta — Tokyo",  "lat": 35.68, "lon":139.69},
        "cluster_05": {"label": "Cluster Epsilon — Dubai","lat": 25.20, "lon": 55.27},
    }
    return STATIC_META.get(node_id, {"label": node_id.replace("_", " ").title(), "lat": 0.0, "lon": 0.0})


# ─────────────────────────────────────────────
# PYDANTIC SCHEMAS
# ─────────────────────────────────────────────
class MetricsPayload(BaseModel):
    cpu:     float = Field(..., ge=0.0, le=100.0,  description="CPU usage in %")
    ram:     float = Field(..., ge=0.0, le=100.0,  description="RAM usage in %")
    network: float = Field(..., ge=0.0,            description="Network throughput in Gbps")


class DeployPayload(BaseModel):
    node_id:      str            = Field(..., description="Identifiant unique du node à déployer")
    scenario_file: str           = Field(..., description="Chemin vers le fichier CSV de scénario")
    interval:     float          = Field(2.0, ge=0.5, le=60.0, description="Intervalle d'envoi en secondes")
    loop:         bool           = Field(True, description="Reboucler sur le CSV en continu")
    backend_url:  Optional[str]  = Field(None, description="URL backend (optionnel, utilise localhost par défaut)")


# ─────────────────────────────────────────────
# FASTAPI APP
# ─────────────────────────────────────────────
app = FastAPI(title="WATCHMAN_OS API", version="3.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Healthcheck ───────────────────────────────────────────────────────────────
@app.get("/")
def read_root():
    return {
        "status":   "online",
        "version":  "3.1.0",
        "ai_model": "loaded" if model else "failed",
        "features": FEATURE_COLS if FEATURE_COLS else [],
    }


# ══════════════════════════════════════════════
# AGENT INGESTION ENDPOINT  — POST /api/report/{node_id}
# C'est ici que les agents déportés envoient leurs données.
# ══════════════════════════════════════════════
@app.post("/api/report/{node_id}")
def ingest_report(node_id: str, payload: MetricsPayload, x_session_id: str = Header("anonymous")):
    return process_metrics(x_session_id, node_id, payload.cpu, payload.ram, payload.network)


# ══════════════════════════════════════════════
# NODE DISCOVERY  — GET /api/nodes
# Retourne la liste exhaustive des nodes actifs
# ══════════════════════════════════════════════
# Remplacer la route /api/nodes
@app.get("/api/nodes")
def list_active_nodes(session_id: str = Depends(get_session)):
    node_ids = get_active_nodes_from_db(session_id)
    return [{"node_id": nid, **get_node_meta(nid)} for nid in node_ids]

# Remplacer la route /api/nodes/status
@app.get("/api/nodes/status")
def get_all_nodes_status(session_id: str = Depends(get_session)):
    node_ids = get_active_nodes_from_db(session_id)
    result   = []
    db       = SessionLocal()
    try:
        for node_id in node_ids:
            log = (
                db.query(MetricLog)
                  .filter(MetricLog.node_id == node_id)
                  .filter(MetricLog.session_id == session_id) # <-- Filtre ajouté
                  .order_by(MetricLog.id.desc())
                  .first()
            )
            meta = get_node_meta(node_id)
            if log:
                result.append({
                    "node_id": node_id, "label": meta["label"],
                    "lat": meta["lat"], "lon": meta["lon"],
                    "cpu": log.cpu, "ram": log.ram, "network": log.network,
                    "alert_level": log.alert_level, "ai_risk_score": log.ai_risk_score,
                    "timestamp": log.timestamp.strftime("%H:%M:%S") if log.timestamp else None,
                })
    finally:
        db.close()
    return result

# Route /stats/{node_id} — filtrée par session, retour complet
@app.get("/stats/{node_id}")
def get_stats(node_id: str, session_id: str = Depends(get_session)):
    db = SessionLocal()
    try:
        log = (
            db.query(MetricLog)
              .filter(MetricLog.node_id == node_id)
              .filter(MetricLog.session_id == session_id)
              .order_by(MetricLog.id.desc())
              .first()
        )
    finally:
        db.close()

    if not log:
        return {
            "node_id": node_id, "cpu": 0.0, "ram": 0.0, "network": 0.0,
            "cpu_delta": 0.0, "ram_delta": 0.0, "combined_load": 0.0,
            "is_anomaly": False, "prediction_code": 1,
            "ai_risk_score": 0, "alert_level": "OK",
            "raw_if_score": 0.0,
            "timestamp": datetime.datetime.now().strftime("%H:%M:%S"),
        }

    return {
        "node_id":         log.node_id,
        "cpu":             log.cpu,
        "ram":             log.ram,
        "network":         log.network,
        "cpu_delta":       log.cpu_delta,
        "ram_delta":       log.ram_delta,
        "combined_load":   log.combined_load,
        "is_anomaly":      log.is_anomaly,
        "prediction_code": -1 if log.is_anomaly else 1,
        "ai_risk_score":   log.ai_risk_score,
        "alert_level":     log.alert_level,
        "raw_if_score":    0.0,
        "timestamp":       log.timestamp.strftime("%H:%M:%S") if log.timestamp else "",
    }

# ── Compat alias (ancienne route /nodes) ─────────────────────────────────────
@app.get("/nodes")
def list_nodes_compat():
    return list_active_nodes()


# ══════════════════════════════════════════════
# SCENARIO DISCOVERY  — GET /api/scenarios
# Scanne le dossier /dataset et retourne les métadonnées
# de chaque fichier CSV : nom, chemin absolu, taille,
# nombre de lignes, preview des colonnes.
# ══════════════════════════════════════════════
@app.get("/api/scenarios")
def list_scenarios():
    """
    Liste tous les fichiers .csv présents dans le dossier /dataset.
    Pour chaque fichier, retourne :
      - filename     : nom du fichier (ex: attack_scenario.csv)
      - path         : chemin absolu utilisable par watchman_agent.py --file
      - size_kb      : taille en Ko
      - row_count    : nombre de lignes de données (hors header)
      - columns      : liste des colonnes détectées
      - has_required : True si cpu, ram, network sont toutes présentes
    Retourne une liste vide si le dossier n'existe pas.
    """
    if not os.path.isdir(DATASET_DIR):
        return []

    scenarios = []
    for filename in sorted(os.listdir(DATASET_DIR)):
        if not filename.lower().endswith(".csv"):
            continue

        filepath = os.path.join(DATASET_DIR, filename)
        size_kb  = round(os.path.getsize(filepath) / 1024, 1)

        columns   = []
        row_count = 0

        try:
            with open(filepath, newline="", encoding="utf-8-sig") as f:
                reader = csv_module.DictReader(f)
                columns = list(reader.fieldnames or [])
                for _ in reader:
                    row_count += 1
        except Exception as e:
            print(f"⚠️  Erreur lecture CSV {filename}: {e}")

        required = {"cpu", "ram", "network"}
        has_required = required.issubset(set(columns))

        scenarios.append({
            "filename":     filename,
            "path":         filepath,
            "size_kb":      size_kb,
            "row_count":    row_count,
            "columns":      columns,
            "has_required": has_required,
        })

    return scenarios


# ══════════════════════════════════════════════
# DEPLOY NODE  — POST /api/nodes/deploy
# Provisionne et lance un agent watchman local à la volée.
#
# Architecture "Active" : le backend orchestre lui-même le lancement
# d'un sous-processus agent, simulant un provisionnement IaC.
#
# En production cloud, ce endpoint pourrait :
#   - Appeler l'API DigitalOcean/AWS pour spawner un container Docker
#   - Exécuter un playbook Ansible via subprocess
#   - Déclencher un pipeline CI/CD via webhook
# ══════════════════════════════════════════════
@app.post("/api/nodes/deploy", status_code=201)
def deploy_node(payload: DeployPayload, session_id: str = Depends(get_session)):
    """
    Lance l'agent watchman_agent.py en sous-processus pour le node demandé.
    Si le node est déjà déployé et actif, retourne une erreur 409.
    """
    node_id = payload.node_id.strip().lower().replace(" ", "_")
    
    # CORRECTION 1 : Créer la clé unique combinant la session et le node
    internal_id = f"{session_id}_{node_id}" 

    # CORRECTION 2 : Vérifier l'existence en utilisant internal_id
    existing = _deployed_processes.get(internal_id)
    if existing and existing.poll() is None:
        raise HTTPException(
            status_code=409,
            detail=f"Node '{node_id}' is already running (PID {existing.pid}). Use killswitch first.",
        )

    # Résolution du chemin de l'agent
    agent_script = os.path.join(os.path.dirname(__file__), "watchman_agent.py")
    if not os.path.exists(agent_script):
        # Fallback : cherche dans le répertoire courant
        agent_script = "watchman_agent.py"

    scenario_path = payload.scenario_file
    if not os.path.exists(scenario_path):
        raise HTTPException(
            status_code=404,
            detail=f"Scenario file not found: '{scenario_path}'. Provide an absolute path or a path relative to the backend working directory.",
        )

    backend_url = payload.backend_url or "http://localhost:8000"

    cmd = [
        sys.executable, agent_script,
        "--node",     node_id,
        "--file",     scenario_path,
        "--interval", str(payload.interval),
        "--backend",  backend_url,
        "--session",  session_id
    ]
    if payload.loop:
        cmd.append("--loop")

    try:
        proc = subprocess.Popen(
            cmd,
            stdout=sys.stdout,
            stderr=sys.stderr,
            text=True,
        )
        # CORRECTION 3 : Sauvegarder le processus avec l'internal_id
        _deployed_processes[internal_id] = proc
        
        # CORRECTION 4 : Optionnel mais recommandé, afficher internal_id dans le print pour le debug
        print(f"🚀 Node déployé : {internal_id} (PID {proc.pid})")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to spawn agent process: {e}")

    return {
        "status":      "deployed",
        "node_id":     node_id,
        "pid":         proc.pid,
        "scenario":    scenario_path,
        "interval":    payload.interval,
        "loop":        payload.loop,
        "backend_url": backend_url,
        "message":     f"Agent launched for node '{node_id}' (PID {proc.pid}). Data will appear in the dashboard within {payload.interval * 2:.0f}s.",
    }


# ── Compat alias nodes/status ────────────────────────────────────────────────


# ══════════════════════════════════════════════
# [NEW] KILLSWITCH  — DELETE /api/nodes/{node_id}
#
# Remédiation complète en 3 étapes :
#   1. Tue le sous-processus agent local s'il existe
#   2. Purge toutes les entrées DB du node
#   3. Efface la fenêtre glissante en mémoire
#
# Niveau 1 implémenté (purge locale).
# Pour un Niveau 2 "Pro" (signal distant), implémenter une WebSocket
# ou un endpoint /shutdown sur l'agent distant.
# ══════════════════════════════════════════════
@app.delete("/api/nodes/{node_id}")
def killswitch_node(node_id: str, session_id: str = Depends(get_session)):
    actions = []
    
    internal_id = f"{session_id}_{node_id}"

    proc = _deployed_processes.pop(internal_id, None)
    if proc:
        if proc.poll() is None:
            proc.terminate()
            try:
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                proc.kill()
                actions.append(f"agent_process: KILLED (PID {proc.pid}, did not terminate gracefully)")
            else:
                actions.append(f"agent_process: TERMINATED (PID {proc.pid})")
        else:
            actions.append(f"agent_process: already_stopped (PID {proc.pid})")
    else:
        actions.append("agent_process: not_found (already stopped or not yours)")

    # ── Étape 2 : Purger la base de données de CETTE session ─────────
    db = SessionLocal()
    deleted_rows = 0
    try:
        deleted_rows = db.query(MetricLog).filter(
            MetricLog.node_id == node_id,
            MetricLog.session_id == session_id
        ).delete()
        db.commit()
        actions.append(f"database: {deleted_rows} records deleted")
    except Exception as e:
        db.rollback()
        actions.append(f"database: ERROR — {e}")
    finally:
        db.close()

    # ── Étape 3 : Effacer la fenêtre glissante en mémoire ────────────
    if internal_id in _windows:
        _windows.pop(internal_id)
        actions.append("memory_window: cleared")

    print(f"🛑 Killswitch activé pour '{internal_id}' | actions : {actions}")

    return {
        "status":       "terminated",
        "node_id":      node_id,
        "deleted_rows": deleted_rows,
        "actions":      actions
    }

# ── Compat alias stats ───────────────────────────────────────────────────────

@app.get("/stats")
def get_stats_compat():
    return get_stats("cluster_01")


# ══════════════════════════════════════════════
# HISTORY  — GET /history/{node_id}
# ══════════════════════════════════════════════
@app.get("/history/{node_id}")
def get_history(node_id: str, session_id: str = Depends(get_session)):
    db   = SessionLocal()
    try:
        logs = (
            db.query(MetricLog)
              .filter(MetricLog.node_id == node_id)
              .filter(MetricLog.session_id == session_id)
              .order_by(MetricLog.id.desc())
              .limit(50)
              .all()
        )
    finally:
        db.close()

    return [
        {
            "node_id":       l.node_id,
            "cpu":           l.cpu,
            "ram":           l.ram,
            "network":       l.network,
            "cpu_delta":     l.cpu_delta,
            "ram_delta":     l.ram_delta,
            "combined_load": l.combined_load,
            "is_anomaly":    l.is_anomaly,
            "ai_risk_score": l.ai_risk_score,
            "alert_level":   l.alert_level,
            "timestamp":     l.timestamp.strftime("%H:%M:%S") if l.timestamp else None,
        }
        for l in reversed(logs)
    ]

@app.get("/history")
def get_history_compat():
    return get_history("cluster_01")


# ── Debug ─────────────────────────────────────────────────────────────────────
@app.get("/window")
def get_window():
    return {
        "window_size":   WINDOW_SIZE,
        "nodes_tracked": {k: list(v) for k, v in _windows.items()},
    }


# ── [NEW] Deployed processes status ──────────────────────────────────────────
@app.get("/api/nodes/processes")
def get_deployed_processes():
    """Debug endpoint : liste les processus agents gérés par le backend."""
    return {
        node_id: {
            "pid":       proc.pid,
            "running":   proc.poll() is None,
            "exit_code": proc.returncode,
        }
        for node_id, proc in _deployed_processes.items()
    }

async def cleanup_task():
    """Tâche de fond qui tourne indéfiniment pendant que le serveur est allumé"""
    while True:
        await asyncio.sleep(300)
        
        cutoff_time = datetime.datetime.utcnow() - datetime.timedelta(minutes=15)
        db = SessionLocal()
        try:
            inactive_sessions = (
                db.query(MetricLog.session_id)
                .group_by(MetricLog.session_id)
                .having(func.max(MetricLog.timestamp) < cutoff_time)
                .all()
            )
            
            for (sid,) in inactive_sessions:
                print(f"🧹 Nettoyage de la session morte : {sid}")
                
                dead_nodes = (
                    db.query(MetricLog.node_id)
                    .filter(MetricLog.session_id == sid)
                    .distinct()
                    .all()
                )
                
                for (nid,) in dead_nodes:
                    print(f"   -> Auto-killswitch du node : {nid}")
                    killswitch_node(nid)
                
            db.commit()
        except Exception as e:
            print(f"⚠️ Erreur Garbage Collector : {e}")
        finally:
            db.close()

@app.on_event("startup")
async def startup_event():
    """Au démarrage de l'API, on lance la tâche de fond"""
    asyncio.create_task(cleanup_task())