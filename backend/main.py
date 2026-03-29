from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Float, Boolean, Integer, DateTime, String
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import OperationalError
import joblib
import numpy as np
import os
import datetime
import time
import pandas as pd
from collections import deque

# ─────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://user:password@dashboard-db:5432/dashboard_ops"
)
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# ─────────────────────────────────────────────
# DATABASE MODEL
# ─────────────────────────────────────────────
class MetricLog(Base):
    __tablename__ = "metrics_history"
    id             = Column(Integer, primary_key=True, index=True)
    cpu            = Column(Float)
    ram            = Column(Float)
    network        = Column(Float, default=0.0)
    cpu_delta      = Column(Float, default=0.0)
    ram_delta      = Column(Float, default=0.0)
    combined_load  = Column(Float, default=0.0)
    is_anomaly     = Column(Boolean)
    ai_risk_score  = Column(Integer, default=0)
    alert_level    = Column(String, default="OK")   # OK | WARNING | CRITICAL
    timestamp      = Column(DateTime, default=datetime.datetime.utcnow)

# ─────────────────────────────────────────────
# DB INIT WITH RETRY
# ─────────────────────────────────────────────
def init_db():
    retries = 10
    while retries > 0:
        try:
            Base.metadata.create_all(bind=engine)
            print("✅ Base de données connectée et tables créées.")
            return True
        except OperationalError:
            retries -= 1
            print(f"⏳ En attente de la DB... ({retries} tentatives restantes)")
            time.sleep(3)
    return False

init_db()

# ─────────────────────────────────────────────
# SCENARIO LOADER
# ─────────────────────────────────────────────
SCENARIO_FILE = "scenario.csv"
try:
    df_scenario = pd.read_csv(SCENARIO_FILE)
    print(f"✅ Scénario chargé : {len(df_scenario)} lignes détectées.")
except Exception as e:
    print(f"❌ Erreur lors du chargement du CSV : {e}")
    df_scenario = pd.DataFrame({'cpu': [0.0], 'ram': [0.0], 'network': [0.0]})

current_line = 0

# ─────────────────────────────────────────────
# LOAD AI MODEL + ARTEFACTS
# ─────────────────────────────────────────────
try:
    model        = joblib.load('model.pkl')
    scaler       = joblib.load('scaler.pkl')
    FEATURE_COLS = joblib.load('feature_cols.pkl')
    print(f"✅ IA chargée — features : {FEATURE_COLS}")
except Exception as e:
    print(f"❌ Erreur chargement IA : {e}")
    model, scaler, FEATURE_COLS = None, None, None

# ─────────────────────────────────────────────
# SLIDING WINDOW — keeps last N readings for
# computing rolling trend features in real-time.
# ─────────────────────────────────────────────
WINDOW_SIZE = 5
_window: deque = deque(maxlen=WINDOW_SIZE)   # stores (cpu, ram, network) tuples

def compute_features(cpu: float, ram: float, network: float) -> dict:
    """
    Build the same enriched feature vector that was used during training,
    using the sliding window to compute rate-of-change deltas.
    """
    _window.append((cpu, ram, network))

    if len(_window) >= 2:
        prev_cpu, prev_ram, prev_net = _window[-2]
        cpu_delta = cpu - prev_cpu
        ram_delta = ram - prev_ram
        net_delta = network - prev_net
    else:
        cpu_delta = ram_delta = net_delta = 0.0

    combined_load = cpu * 0.50 + ram * 0.40 + network * 0.10
    cpu_ram_ratio = cpu / (ram + 1e-6)

    return {
        "cpu":           cpu,
        "ram":           ram,
        "network":       network,
        "cpu_delta":     cpu_delta,
        "ram_delta":     ram_delta,
        "net_delta":     net_delta,
        "combined_load": combined_load,
        "cpu_ram_ratio": cpu_ram_ratio,
    }

def get_alert_level(risk_score: int, cpu_delta: float, ram_delta: float) -> str:
    """
    Three-tier alert system:
      CRITICAL : risk > 70 OR both metrics rising fast
      WARNING  : risk > 35 OR a metric is accelerating
      OK       : everything nominal
    """
    rising_fast = cpu_delta > 8 or ram_delta > 6
    if risk_score > 70 or (risk_score > 50 and rising_fast):
        return "CRITICAL"
    if risk_score > 35 or rising_fast:
        return "WARNING"
    return "OK"

# ─────────────────────────────────────────────
# FASTAPI APP
# ─────────────────────────────────────────────
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.get("/")
def read_root():
    return {
        "status":    "online",
        "mode":      "simulation",
        "ai_model":  "loaded" if model else "failed",
        "features":  FEATURE_COLS if FEATURE_COLS else [],
    }

@app.get("/stats")
def get_stats():
    global current_line

    # ── 1. Read next scenario row ──────────────────────────────────────────
    row = df_scenario.iloc[current_line]
    cpu, ram, network = float(row['cpu']), float(row['ram']), float(row['network'])
    current_line = (current_line + 1) % len(df_scenario)

    # ── 2. Build enriched feature vector ──────────────────────────────────
    features = compute_features(cpu, ram, network)

    # ── 3. AI PREDICTION ──────────────────────────────────────────────────
    is_anomaly    = False
    prediction_code = 1
    ai_risk_score   = 0
    alert_level     = "OK"
    raw_score       = 0.0

    if model and scaler and FEATURE_COLS:
        try:
            feature_vector = np.array([[features[c] for c in FEATURE_COLS]])
            scaled_vector  = scaler.transform(feature_vector)

            raw_score = model.decision_function(scaled_vector)[0]

            # Map IsolationForest score → 0-100 risk percentage
            # Score near +0.15 = very normal; score near -0.5 = deep anomaly
            risk_float    = (0.15 - raw_score) * 400
            ai_risk_score = int(max(0, min(100, risk_float)))

            alert_level     = get_alert_level(
                ai_risk_score,
                features["cpu_delta"],
                features["ram_delta"]
            )
            is_anomaly      = alert_level != "OK"
            prediction_code = -1 if is_anomaly else 1

        except Exception as e:
            print(f"⚠️  Erreur prédiction IA : {e}")

    # ── 4. SAVE TO DB ──────────────────────────────────────────────────────
    try:
        db = SessionLocal()
        db.add(MetricLog(
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
        db.close()
    except Exception as e:
        print(f"⚠️  Erreur sauvegarde DB : {e}")

    # ── 5. RETURN ENRICHED PAYLOAD ─────────────────────────────────────────
    return {
        # Raw metrics
        "cpu":            cpu,
        "ram":            ram,
        "network":        network,
        # Trend indicators (useful for frontend sparklines)
        "cpu_delta":      round(features["cpu_delta"], 2),
        "ram_delta":      round(features["ram_delta"], 2),
        "combined_load":  round(features["combined_load"], 2),
        # AI output
        "is_anomaly":     is_anomaly,
        "prediction_code": prediction_code,
        "ai_risk_score":  ai_risk_score,
        "alert_level":    alert_level,        # "OK" | "WARNING" | "CRITICAL"
        "raw_if_score":   round(float(raw_score), 4),
        "timestamp":      datetime.datetime.now().strftime("%H:%M:%S"),
    }

@app.get("/history")
def get_history():
    db   = SessionLocal()
    logs = db.query(MetricLog).order_by(MetricLog.id.desc()).limit(50).all()
    db.close()
    return [
        {
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

@app.get("/window")
def get_window():
    """Debug endpoint — returns the current sliding window state."""
    return {
        "window_size": WINDOW_SIZE,
        "current_entries": list(_window),
    }