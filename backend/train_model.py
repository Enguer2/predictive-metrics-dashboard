import pandas as pd
from sklearn.ensemble import IsolationForest
import joblib
import numpy as np

data = np.random.normal(size=(1000, 2)) 
df = pd.DataFrame(data, columns=['cpu_usage', 'ram_usage'])

model = IsolationForest(contamination=0.05)
model.fit(df)

joblib.dump(model, 'model.pkl')
print("Modèle entraîné et sauvegardé sous 'model.pkl'")