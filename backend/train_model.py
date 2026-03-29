import pandas as pd
import joblib
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

# ─────────────────────────────────────────────
# 1. LOAD DATA
# ─────────────────────────────────────────────
df = pd.read_csv("scenario.csv")
print(f"📂 Scénario chargé : {len(df)} lignes")

# ─────────────────────────────────────────────
# 2. FEATURE ENGINEERING
# ─────────────────────────────────────────────
CPU_DANGER  = 85.0
RAM_DANGER  = 85.0
RAM_CRITICAL = 95.0

def build_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Features enrichies en 3 familles :
      [A] Valeurs brutes         → cpu, ram, network
      [B] Taux de changement     → cpu_delta, ram_delta, net_delta  (détection précoce)
      [C] Saturation absolue     → cpu_pressure, ram_pressure        (détection plafond)
          combined_load          → index de pression globale
          cpu_ram_ratio          → déséquilibre entre CPU et RAM
    """
    feat = df[['cpu', 'ram', 'network']].copy()

    feat['cpu_delta'] = feat['cpu'].diff().fillna(0)
    feat['ram_delta'] = feat['ram'].diff().fillna(0)
    feat['net_delta'] = feat['network'].diff().fillna(0)

    feat['cpu_pressure'] = (feat['cpu'] - CPU_DANGER).clip(lower=0)
    feat['ram_pressure'] = (feat['ram'] - RAM_DANGER).clip(lower=0)

    # Pression critique RAM (seuil encore plus haut → signal très fort)
    feat['ram_critical'] = (feat['ram'] - RAM_CRITICAL).clip(lower=0)

    # Index de pression globale pondéré
    feat['combined_load'] = (
        feat['cpu'] * 0.45 +
        feat['ram'] * 0.45 +
        feat['network'] * 0.10
    )

    # Ratio CPU/RAM : déséquilibre = anomalie de type différent
    feat['cpu_ram_ratio'] = feat['cpu'] / (feat['ram'] + 1e-6)

    return feat

all_features = build_features(df)

# ─────────────────────────────────────────────
# 3. TRAINING DATA — état normal uniquement
# ─────────────────────────────────────────────
NORMAL_ROWS = 8
train_data = all_features.head(NORMAL_ROWS).copy()

np.random.seed(42)
train_data['cpu']     += np.random.normal(0, 0.8,  size=len(train_data))
train_data['ram']     += np.random.normal(0, 0.5,  size=len(train_data))
train_data['network'] += np.random.normal(0, 0.05, size=len(train_data))

train_data['cpu_delta']    = train_data['cpu'].diff().fillna(0)
train_data['ram_delta']    = train_data['ram'].diff().fillna(0)
train_data['net_delta']    = train_data['network'].diff().fillna(0)
train_data['cpu_pressure'] = (train_data['cpu'] - CPU_DANGER).clip(lower=0)
train_data['ram_pressure'] = (train_data['ram'] - RAM_DANGER).clip(lower=0)
train_data['ram_critical'] = (train_data['ram'] - RAM_CRITICAL).clip(lower=0)
train_data['combined_load'] = (
    train_data['cpu'] * 0.45 +
    train_data['ram'] * 0.45 +
    train_data['network'] * 0.10
)
train_data['cpu_ram_ratio'] = train_data['cpu'] / (train_data['ram'] + 1e-6)

FEATURE_COLS = [
    'cpu', 'ram', 'network',
    'cpu_delta', 'ram_delta', 'net_delta',
    'cpu_pressure', 'ram_pressure', 'ram_critical',
    'combined_load', 'cpu_ram_ratio',
]

print(f"🧠 Entraînement sur {len(train_data)} lignes normales, {len(FEATURE_COLS)} features")

# ─────────────────────────────────────────────
# 4. NORMALISATION
# ─────────────────────────────────────────────
scaler = StandardScaler()
train_scaled = scaler.fit_transform(train_data[FEATURE_COLS])

# ─────────────────────────────────────────────
# 5. ISOLATION FOREST
# ─────────────────────────────────────────────
model = IsolationForest(
    n_estimators=1000,
    contamination=0.01,
    max_features=1.0,
    random_state=42,
    n_jobs=-1
)
model.fit(train_scaled)

# ─────────────────────────────────────────────
# 6. SCORE HYBRIDE
# ─────────────────────────────────────────────
def compute_hybrid_risk(if_score: float, cpu: float, ram: float) -> int:
    """
    Score final = score IA + bonus de saturation absolue.

    Le bonus monte progressivement dès que CPU ou RAM
    franchissent leur seuil danger, indépendamment du delta.
    """
    # Score IA → 0-100
    if_risk = (0.15 - if_score) * 400

    ram_bonus = 0.0
    if ram >= RAM_CRITICAL:          # ≥ 95% → bonus très fort (45 pts max)
        ram_bonus = ((ram - RAM_CRITICAL) / (100 - RAM_CRITICAL + 1e-6)) * 45
    elif ram >= RAM_DANGER:          # ≥ 85% → bonus modéré (20 pts max)
        ram_bonus = ((ram - RAM_DANGER) / (RAM_CRITICAL - RAM_DANGER)) * 20

    cpu_bonus = 0.0
    if cpu >= CPU_DANGER:            # ≥ 85% → bonus modéré (20 pts max)
        cpu_bonus = ((cpu - CPU_DANGER) / (100 - CPU_DANGER + 1e-6)) * 20

    total = if_risk + ram_bonus + cpu_bonus
    return int(max(0, min(100, total)))

# ─────────────────────────────────────────────
# 7. SELF-TEST sur tout le scénario
# ─────────────────────────────────────────────
print("\n📊 Auto-évaluation sur tout le scénario :")
all_scaled = scaler.transform(all_features[FEATURE_COLS])
if_scores  = model.decision_function(all_scaled)

for i, (if_score, row) in enumerate(zip(if_scores, df.itertuples())):
    risk = compute_hybrid_risk(if_score, row.cpu, row.ram)
    if   risk > 70: flag = "🔴 CRITIQUE"
    elif risk > 40: flag = "🟠 WARNING "
    else:           flag = "🟢 Normal  "
    print(
        f"  Ligne {i+1:02d} | CPU={row.cpu:5.1f}% RAM={row.ram:5.1f}% NET={row.network:.1f}"
        f" | IFscore={if_score:+.4f}  Risk={risk:3d}%  {flag}"
    )

# ─────────────────────────────────────────────
# 8. SAVE ARTEFACTS
# ─────────────────────────────────────────────
THRESHOLDS = {
    "cpu_danger":   CPU_DANGER,
    "ram_danger":   RAM_DANGER,
    "ram_critical": RAM_CRITICAL,
}

joblib.dump(model,        'model.pkl')
joblib.dump(scaler,       'scaler.pkl')
joblib.dump(FEATURE_COLS, 'feature_cols.pkl')
joblib.dump(THRESHOLDS,   'thresholds.pkl')   # partagé avec main.py

print("\n✅ model.pkl | scaler.pkl | feature_cols.pkl | thresholds.pkl — sauvegardés.")
print("🚀 Score hybride actif : RAM 99.9% sera désormais CRITIQUE, même si stable.")