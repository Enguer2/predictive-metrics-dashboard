"""
main.py — WATCHMAN_OS Backend
──────────────────────────────
Architecture :
  POST /api/report/{node_id}  ← reçoit les données brutes des agents
  GET  /api/nodes             ← liste les nodes actifs (Plug & Play)
  GET  /api/nodes/status      ← dernier snapshot de chaque node
  GET  /stats/{node_id}       ← polling frontend (mode legacy/simulation)
  GET  /history/{node_id}     ← 50 derniers points d'un node
  GET  /                      ← healthcheck
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, Column, Float, Boolean, Integer, DateTime, String, func
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import OperationalError
import joblib
import numpy as np
import os
import datetime
import time
from collections import deque

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
def process_metrics(node_id: str, cpu: float, ram: float, network: float) -> dict:
    """Calcule les features, fait tourner l'IA, sauvegarde en DB, retourne le payload."""
    features        = compute_features(node_id, cpu, ram, network)
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
            print(f"⚠️  Erreur prédiction IA [{node_id}]: {e}")

    # Persist
    try:
        db = SessionLocal()
        db.add(MetricLog(
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
        print(f"⚠️  Erreur sauvegarde DB [{node_id}]: {e}")
    finally:
        db.close()

    return {
        "node_id":         node_id,
        "cpu":             cpu,
        "ram":             ram,
        "network":         network,
        "cpu_delta":       round(features["cpu_delta"], 2),
        "ram_delta":       round(features["ram_delta"], 2),
        "combined_load":   round(features["combined_load"], 2),
        "is_anomaly":      is_anomaly,
        "prediction_code": prediction_code,
        "ai_risk_score":   ai_risk_score,
        "alert_level":     alert_level,
        "raw_if_score":    round(float(raw_score), 4),
        "timestamp":       datetime.datetime.now().strftime("%H:%M:%S"),
    }


# ─────────────────────────────────────────────
# DYNAMIC NODE REGISTRY  (Plug & Play)
# ─────────────────────────────────────────────
def get_active_nodes_from_db() -> list[str]:
    """Retourne tous les node_id distincts ayant déjà envoyé des données."""
    try:
        db    = SessionLocal()
        rows  = db.query(MetricLog.node_id).distinct().all()
        return [r.node_id for r in rows]
    except Exception:
        return []
    finally:
        db.close()


def get_node_meta(node_id: str) -> dict:
    """Métadonnées statiques. Pour un vrai agent, elles pourraient être POSTées à l'enregistrement."""
    STATIC_META: dict[str, dict] = {
        "cluster_01": {"label": "Satellite Relay / Northern Sector",  "lat":  64.1265, "lon": -21.8174},
        "cluster_02": {"label": "Edge Node / Western Grid Relay",     "lat":  48.8566, "lon":   2.3522},
        "cluster_03": {"label": "Deep Sync / Southern Observatory",   "lat": -33.8688, "lon": 151.2093},
    }
    return STATIC_META.get(node_id, {"label": node_id.replace("_", " ").title(), "lat": 0.0, "lon": 0.0})


# ─────────────────────────────────────────────
# PYDANTIC SCHEMA (pour l'ingestion agent)
# ─────────────────────────────────────────────
class MetricsPayload(BaseModel):
    cpu:     float = Field(..., ge=0.0, le=100.0,  description="CPU usage in %")
    ram:     float = Field(..., ge=0.0, le=100.0,  description="RAM usage in %")
    network: float = Field(..., ge=0.0,            description="Network throughput in Gbps")


# ─────────────────────────────────────────────
# FASTAPI APP
# ─────────────────────────────────────────────
app = FastAPI(title="WATCHMAN_OS API", version="3.0.0")
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
        "version":  "3.0.0",
        "ai_model": "loaded" if model else "failed",
        "features": FEATURE_COLS if FEATURE_COLS else [],
    }


# ══════════════════════════════════════════════
# AGENT INGESTION ENDPOINT  — POST /api/report/{node_id}
# C'est ici que les agents déportés envoient leurs données.
# ══════════════════════════════════════════════
@app.post("/api/report/{node_id}")
def ingest_report(node_id: str, payload: MetricsPayload):
    """
    Reçoit les métriques brutes d'un agent, applique l'IA et stocke le résultat.
    Si node_id est inconnu, il est enregistré dynamiquement (Plug & Play).
    """
    return process_metrics(node_id, payload.cpu, payload.ram, payload.network)


# ══════════════════════════════════════════════
# NODE DISCOVERY  — GET /api/nodes
# Retourne la liste exhaustive des nodes actifs
# (utilisé par la Sidebar pour l'effet Plug & Play)
# ══════════════════════════════════════════════
@app.get("/api/nodes")
def list_active_nodes():
    """
    Renvoie tous les nodes ayant transmis au moins une fois.
    Le frontend l'interroge toutes les Xs pour détecter les nouveaux agents.
    """
    node_ids = get_active_nodes_from_db()
    return [
        {"node_id": nid, **get_node_meta(nid)}
        for nid in node_ids
    ]


# ── Compat alias (ancienne route /nodes) ─────────────────────────────────────
@app.get("/nodes")
def list_nodes_compat():
    return list_active_nodes()


# ══════════════════════════════════════════════
# NODE STATUS MAP  — GET /api/nodes/status
# Dernier snapshot de chaque node (pour NodeMap)
# ══════════════════════════════════════════════
@app.get("/api/nodes/status")
def get_all_nodes_status():
    node_ids = get_active_nodes_from_db()
    result   = []
    db       = SessionLocal()
    try:
        for node_id in node_ids:
            log = (
                db.query(MetricLog)
                  .filter(MetricLog.node_id == node_id)
                  .order_by(MetricLog.id.desc())
                  .first()
            )
            meta = get_node_meta(node_id)
            if log:
                result.append({
                    "node_id":       node_id,
                    "label":         meta["label"],
                    "lat":           meta["lat"],
                    "lon":           meta["lon"],
                    "cpu":           log.cpu,
                    "ram":           log.ram,
                    "network":       log.network,
                    "alert_level":   log.alert_level,
                    "ai_risk_score": log.ai_risk_score,
                    "timestamp":     log.timestamp.strftime("%H:%M:%S") if log.timestamp else None,
                })
            else:
                result.append({
                    "node_id": node_id, "label": meta["label"],
                    "lat": meta["lat"], "lon": meta["lon"],
                    "cpu": 0.0, "ram": 0.0, "network": 0.0,
                    "alert_level": "OK", "ai_risk_score": 0, "timestamp": None,
                })
    finally:
        db.close()
    return result


# ── Compat alias ─────────────────────────────────────────────────────────────
@app.get("/nodes/status")
def nodes_status_compat():
    return get_all_nodes_status()


# ══════════════════════════════════════════════
# STATS POLLING  — GET /stats/{node_id}
# Conservé pour compatibilité frontend (mode pull).
# En mode agent, c'est le POST /api/report qui alimente la DB ;
# ce endpoint lit simplement la dernière ligne pour ce node.
# ══════════════════════════════════════════════
@app.get("/stats/{node_id}")
def get_stats(node_id: str):
    """
    Retourne le dernier enregistrement connu pour ce node.
    Si aucune donnée n'existe encore, retourne des zéros (état initial).
    """
    db  = SessionLocal()
    try:
        log = (
            db.query(MetricLog)
              .filter(MetricLog.node_id == node_id)
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

@app.get("/stats")
def get_stats_compat():
    return get_stats("cluster_01")


# ══════════════════════════════════════════════
# HISTORY  — GET /history/{node_id}
# ══════════════════════════════════════════════
@app.get("/history/{node_id}")
def get_history(node_id: str):
    db   = SessionLocal()
    try:
        logs = (
            db.query(MetricLog)
              .filter(MetricLog.node_id == node_id)
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