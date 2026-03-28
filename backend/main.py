from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Float, Boolean, Integer, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import OperationalError
import psutil
import joblib
import numpy as np
import os
import datetime
import time

# Configuration
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@dashboard-db:5432/dashboard_ops")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Modèle de la table
class MetricLog(Base):
    __tablename__ = "metrics_history"
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    cpu = Column(Float)
    ram = Column(Float)
    is_anomaly = Column(Boolean)

# Fonction de connexion résiliente (attend que la DB soit prête)
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

# Lancement de la connexion
create_tables_with_retry()

# --- APP FASTAPI ---
app = FastAPI()

# Chargement sécurisé du modèle
model = joblib.load('model.pkl')

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "online"}

@app.get("/stats")
def get_stats():
    # Lecture réelle
    cpu = psutil.cpu_percent(interval=None)
    ram = psutil.virtual_memory().percent
    
    # Prédiction IA
    data = np.array([[cpu, ram]])
    prediction = model.predict(data)
    is_anomaly = bool(prediction[0] == -1)
    
    # Sauvegarde
    try:
        db = SessionLocal()
        new_log = MetricLog(cpu=cpu, ram=ram, is_anomaly=is_anomaly)
        db.add(new_log)
        db.commit()
        db.refresh(new_log)
        db.close()
    except Exception as e:
        print(f"Erreur sauvegarde DB : {e}")
    
    return {
        "cpu": cpu, 
        "ram": ram, 
        "is_anomaly": is_anomaly,
        "prediction_code": int(prediction[0])
    }