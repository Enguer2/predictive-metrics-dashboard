from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import psutil
import joblib
import numpy as np
import os
from sqlalchemy import create_engine, Column, Float, Boolean, Integer, String, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import datetime

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@db:5432/sentinel_ops")
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

# Création de la table au démarrage
Base.metadata.create_all(bind=engine)

# --- APP FASTAPI ---
app = FastAPI()
model = joblib.load('model.pkl')

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # En local on peut être large
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/stats")
def get_stats():
    cpu = psutil.cpu_percent(interval=None)
    ram = psutil.virtual_memory().percent
    
    data = np.array([[cpu, ram]])
    prediction = model.predict(data)
    is_anomaly = bool(prediction[0] == -1)
    
    # SAUVEGARDE DANS LA DB
    db = SessionLocal()
    new_log = MetricLog(cpu=cpu, ram=ram, is_anomaly=is_anomaly)
    db.add(new_log)
    db.commit()
    db.close()
    
    return {"cpu": cpu, "ram": ram, "is_anomaly": is_anomaly}