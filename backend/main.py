from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Float, Boolean, Integer, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import OperationalError
import joblib
import numpy as np
import os
import datetime
import time
import pandas as pd  # Import ajouté pour lire le CSV

# Configuration
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@dashboard-db:5432/dashboard_ops")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- INITIALISATION DU SIMULATEUR ---
# Charge le fichier CSV. Assure-toi qu'il est bien dans le dossier /backend/
SCENARIO_FILE = "scenario.csv"
try:
    df_scenario = pd.read_csv(SCENARIO_FILE)
    print(f"Scénario chargé : {len(df_scenario)} lignes détectées.")
except Exception as e:
    print(f"Erreur lors du chargement du CSV : {e}")
    # Fallback au cas où le fichier est manquant pour éviter un crash au démarrage
    df_scenario = pd.DataFrame({'cpu': [0.0], 'ram': [0.0]})

current_line = 0

class MetricLog(Base):
    __tablename__ = "metrics_history"
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    cpu = Column(Float)
    ram = Column(Float)
    is_anomaly = Column(Boolean)

def create_tables_with_retry():
    retries = 10
    while retries > 0:
        try:
            print(f"Tentative de connexion à la DB... ({retries} essais restants)")
            Base.metadata.create_all(bind=engine)
            print("Base de données connectée et tables créées !")
            return
        except (OperationalError, Exception) as e:
            retries -= 1
            print(f"Erreur DB : {e}. Nouvel essai dans 3s...")
            time.sleep(3)
    raise Exception("Impossible de joindre la base de données.")

create_tables_with_retry()

app = FastAPI()
model = joblib.load('model.pkl')

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "online", "mode": "simulation"}

@app.get("/stats")
def get_stats():
    global current_line
    
    row = df_scenario.iloc[current_line]
    cpu = float(row['cpu'])
    ram = float(row['ram'])
    
    current_line = (current_line + 1) % len(df_scenario)
    
    data = np.array([[cpu, ram]])
    prediction = model.predict(data)
    is_anomaly = bool(prediction[0] == -1)
    
    try:
        db = SessionLocal()
        new_log = MetricLog(cpu=cpu, ram=ram, is_anomaly=is_anomaly)
        db.add(new_log)
        db.commit()
        db.close()
    except Exception as e:
        print(f"Erreur sauvegarde DB : {e}")
    
    return {
        "cpu": cpu, 
        "ram": ram, 
        "is_anomaly": is_anomaly,
        "prediction_code": int(prediction[0]),
        "timestamp": datetime.datetime.now().strftime("%H:%M:%S")
    }

@app.get("/history")
def get_history():
    db = SessionLocal()
    logs = db.query(MetricLog).order_by(MetricLog.id.desc()).limit(50).all()
    db.close()
    
    history = []
    for log in reversed(logs):
        history.append({
            "cpu": log.cpu,
            "ram": log.ram,
            "is_anomaly": log.is_anomaly,
            "timestamp": log.timestamp.strftime("%H:%M:%S")
        })
    return history