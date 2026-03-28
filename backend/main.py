from fastapi import FastAPI
from pydantic import BaseModel
import joblib
import numpy as np

model = joblib.load('model.pkl')

app = FastAPI()

class Metrics(BaseModel):
    cpu_usage: float
    ram_usage: float

@app.get("/")
def home():
    return {"status": "online", "message": "Sentinel AI-Ops API is ready"}

@app.post("/predict")
def predict(metrics: Metrics):
    data = np.array([[metrics.cpu_usage, metrics.ram_usage]])
    
    # AI return : (-1 = Anomalie, 1 = Normal)
    prediction = model.predict(data)
    
    return {
        "is_anomaly": bool(prediction[0] == -1),
        "prediction_code": int(prediction[0])
    }