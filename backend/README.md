# 🧠 Architecture IA — Détection d'Anomalies Système

> **Langue :** 🇫🇷 Document en français · *[English version is below]*  
> **Fichiers concernés :** [`train_model.py`](./train_model.py) · [`main.py`](./main.py) · [`scenario.csv`](./scenario.csv)

Ce document décrit le pipeline de Machine Learning utilisé pour détecter des comportements anormaux sur un serveur en temps réel. Contrairement à un monitoring classique basé sur des seuils fixes, ce système comprend la notion de **comportement** et s'adapte à la baseline d'un serveur au repos.

---

## Sommaire

1. [Vue d'ensemble du pipeline](#1-vue-densemble-du-pipeline)
2. [Choix du modèle : Isolation Forest](#2-choix-du-modèle--isolation-forest)
3. [Feature Engineering : les 11 indicateurs](#3-feature-engineering--les-11-indicateurs)
4. [Stratégie d'entraînement : Augmentation par Jittering](#4-stratégie-dentraînement--augmentation-par-jittering)
5. [Système de décision hybride (ML + Règles Expertes)](#5-système-de-décision-hybride-ml--règles-expertes)
6. [Limites connues](#6-limites-connues)

---

## 1. Vue d'ensemble du pipeline

![Architecture Analytique](assets/svg_architecture_fr.svg)

---

## 2. Choix du modèle : Isolation Forest

### Pourquoi Isolation Forest ?

Ce projet utilise [`sklearn.ensemble.IsolationForest`](https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.IsolationForest.html) pour plusieurs raisons structurelles :

| Critère | Isolation Forest | Alternatives écartées |
|---|---|---|
| **Données labellisées** | ❌ Non requis (non supervisé) | One-Class SVM, Autoencoders nécessitent plus de données |
| **Temps réel** | ✅ Inférence en O(log n) | LOF recalcule les voisins à chaque point |
| **Faible volume d'entraînement** | ✅ Robuste | Autoencoders sur-apprennent facilement |
| **Interprétabilité** | ✅ Score = profondeur d'isolation | Réseaux de neurones = boîte noire |

### Comment fonctionne l'algorithme ?

L'Isolation Forest génère une forêt de **1 000 arbres de décision aléatoires** et tente d'*isoler* chaque point de donnée en partitionnant l'espace de features au hasard.

- Une donnée **normale** est noyée dans la masse → nécessite de *nombreuses* coupures pour être isolée → **profondeur élevée**.
- Une **anomalie** (pic de trafic, comportement erratique) est structurellement différente → isolée en *très peu* d'étapes → **profondeur faible**.

C'est cette profondeur d'isolation qui définit mathématiquement le `IF_Score` retourné par `decision_function()`.

**Hyperparamètres clés** (cf. [`train_model.py`](./train_model.py#L97)) :

```python
IsolationForest(
    n_estimators=1000,   # 1 000 arbres → variance minimale du score
    contamination=0.01,  # Hypothèse : ~1% des points d'entraînement sont aberrants
    max_features=1.0,    # Tous les features utilisés à chaque split
    random_state=42,     # Reproductibilité garantie
    n_jobs=-1            # Parallélisation sur tous les cœurs disponibles
)
```

---

## 3. Feature Engineering : les 11 indicateurs

Pour offrir une vision multidimensionnelle à l'IA, les 3 métriques brutes sont transformées en un espace vectoriel de **11 indicateurs** répartis en quatre familles.

### Tableau des features

| # | Feature | Famille | Formule | Rôle |
|---|---|---|---|---|
| 1 | `cpu` | Brute | — | Charge CPU instantanée (%) |
| 2 | `ram` | Brute | — | Occupation RAM instantanée (%) |
| 3 | `network` | Brute | — | Débit réseau instantané |
| 4 | `cpu_delta` | Vitesse | $CPU_t - CPU_{t-1}$ | Détecte les accélérations brutales de CPU |
| 5 | `ram_delta` | Vitesse | $RAM_t - RAM_{t-1}$ | Détecte les montées rapides de mémoire |
| 6 | `net_delta` | Vitesse | $NET_t - NET_{t-1}$ | Détecte les pics de trafic réseau |
| 7 | `cpu_pressure` | Saturation | $\max(0,\ CPU_t - 85)$ | Pression CPU au-delà du seuil danger |
| 8 | `ram_pressure` | Saturation | $\max(0,\ RAM_t - 85)$ | Pression RAM au-delà du seuil danger |
| 9 | `ram_critical` | Saturation | $\max(0,\ RAM_t - 95)$ | Signal fort de saturation RAM critique |
| 10 | `combined_load` | Corrélation | $(CPU \times 0.45) + (RAM \times 0.45) + (NET \times 0.10)$ | Indice de pression systémique globale |
| 11 | `cpu_ram_ratio` | Corrélation | $CPU_t\ /\ (RAM_t + 10^{-6})$ | Détecte les déséquilibres CPU/RAM |

### Pourquoi ces familles ?

- **Métriques Brutes :** L'état instantané du système. Nécessaires, mais insuffisants seuls.
- **Indicateurs de Vitesse (Deltas) :** Pour une attaque de type Brute Force, *l'accélération* de la charge est plus révélatrice que la valeur absolue. Un passage brutal de 10% à 50% de CPU est détecté immédiatement.
- **Indicateurs de Pression (Saturation) :** Mesurent l'intensité *au-delà* des seuils critiques. Ils restent non nuls même si les deltas tombent à zéro (contrairement aux seules métriques brutes).
- **Indicateurs de Corrélation :** Le `cpu_ram_ratio` identifie des anomalies comportementales spécifiques — par exemple, un processus de calcul intensif *sans usage mémoire* (minage de cryptomonnaie, boucle infinie). Le `combined_load` capte la pression systémique agrégée.

---

## 4. Stratégie d'entraînement : Augmentation par Jittering

### Données d'entraînement

Le modèle s'entraîne **uniquement** sur les 8 premières lignes de [`scenario.csv`](./scenario.csv), qui représentent le serveur en état normal (CPU ~10–12%, RAM ~20%, Réseau ~0.1).

### Problème : sur-apprentissage sur données statiques

Avec seulement 8 points quasi-identiques, le modèle risquerait d'apprendre que la normalité est une valeur *exacte*, et non une *zone de tolérance*. Toute légère variation déclencherait une fausse alarme.

### Solution : Jittering (bruit gaussien)

Un bruit gaussien est ajouté à chaque feature des données d'entraînement :

$$Feature_{train} = Feature_{brute} + \mathcal{N}(\mu=0,\ \sigma^2)$$

Avec les écarts-types suivants (cf. [`train_model.py`](./train_model.py#L62)) :

| Feature | $\sigma$ (bruit ajouté) |
|---|---|
| `cpu` | 0.8% |
| `ram` | 0.5% |
| `network` | 0.05 |

Cette technique enseigne à l'IA que la « normalité » est une **zone de tolérance multidimensionnelle**, et non un point fixe.

### Normalisation

Après augmentation, les features sont normalisées via `StandardScaler` (moyenne = 0, écart-type = 1) pour que les features à grande échelle ne dominent pas les autres lors du partitionnement de l'arbre.

---

## 5. Système de décision hybride (ML + Règles Expertes)

### L'angle mort de l'IA pure : le Concept Drift

Si une anomalie *perdure* (ex : fuite mémoire bloquant la RAM à 99% pendant une heure), les deltas retombent à zéro. Le modèle probabiliste peut alors tolérer cet état comme une « nouvelle normalité » — c'est le phénomène de **Concept Drift**.

### La solution : le Score Hybride

Le risque final fusionne le score ML avec des **coupe-circuits déterministes** basés sur la saturation physique absolue :

$$Risk_{total} = Risk_{IA} + Bonus_{CPU} + Bonus_{RAM}$$

**Conversion du score Isolation Forest → risque (0–100) :**

$$Risk_{IA} = (0.15 - IF\_Score) \times 400$$

**Bonus de saturation RAM (coupe-circuit) :**

$$Bonus_{RAM} = \begin{cases} \left(\dfrac{RAM_t - 95}{100 - 95}\right) \times 45 & \text{si } RAM_t \geq 95\%\ \text{(max +45 pts)} \\ \left(\dfrac{RAM_t - 85}{95 - 85}\right) \times 20 & \text{si } RAM_t \geq 85\%\ \text{(max +20 pts)} \end{cases}$$

**Bonus de saturation CPU :**

$$Bonus_{CPU} = \left(\frac{CPU_t - 85}{100 - 85}\right) \times 20 \quad \text{si } CPU_t \geq 85\%\ \text{(max +20 pts)}$$

**Niveaux d'alerte :**

| Score | Niveau | Couleur |
|---|---|---|
| > 70 | 🔴 CRITIQUE | Rouge |
| 40 – 70 | 🟠 WARNING | Orange |
| < 40 | 🟢 Normal | Vert |

**Résultat clé :** Une saturation RAM garantie à 99% génère un bonus de +45 pts sur le score, surpassant systématiquement le jugement probabiliste. Cela assure une **tolérance zéro** sur les pannes physiques critiques, indépendamment de l'état interne du modèle.

---

## 6. Limites connues

| Limite | Description | Impact |
|---|---|---|
| **Cold Start** | Le modèle s'entraîne sur seulement 8 points. Sa baseline est fragile en début de vie. | Faux positifs possibles lors des premières minutes d'inférence |
| **Concept Drift** | Partiellement corrigé par le score hybride, mais un changement durable de la charge normale (ex : mise à l'échelle du serveur) peut fausser les prédictions IA | Réentraînement périodique recommandé |
| **Paramètre `contamination`** | Fixé à 1% de façon empirique. S'il est trop bas, le modèle sera trop permissif ; trop haut, trop sensible. | À ajuster selon le profil réel du serveur |
| **Données de test statiques** | Le [`scenario.csv`](./scenario.csv) est un fichier de 18 lignes simulé manuellement. Il ne couvre pas tous les vecteurs d'attaque réels. | Les anomalies non représentées peuvent être sous-détectées |
| **Absence de dimension temporelle** | L'Isolation Forest ne modélise pas de séquences. Les patterns cycliques (cron jobs, pics horaires) peuvent être mal classifiés. | Une évolution vers un modèle séquentiel (LSTM Autoencoder) est envisageable |

<br>
<br>
<br>
<br>
<br>

# 🧠 AI Architecture — System Anomaly Detection

> **Language:** 🇬🇧 Document in English · *[French version available]*  
> **Relevant files:** [`train_model.py`](./train_model.py) · [`main.py`](./main.py) · [`scenario.csv`](./scenario.csv)

This document describes the Machine Learning pipeline used to detect abnormal behaviors on a server in real-time. Unlike traditional monitoring based on fixed thresholds, this system understands the concept of **behavior** and adapts to the baseline of a server at rest.

---

## Table of Contents

1. [Pipeline Overview](#1-pipeline-overview)
2. [Model Choice: Isolation Forest](#2-model-choice-isolation-forest)
3. [Feature Engineering: The 11 Indicators](#3-feature-engineering-the-11-indicators)
4. [Training Strategy: Augmentation via Jittering](#4-training-strategy-augmentation-via-jittering)
5. [Hybrid Decision System (ML + Expert Rules)](#5-hybrid-decision-system-ml--expert-rules)
6. [Known Limitations](#6-known-limitations)

---

## 1. Pipeline Overview

![Analytical Architecture](assets/svg_architecture_en.svg)

---

## 2. Model Choice: Isolation Forest

### Why Isolation Forest?

This project uses [`sklearn.ensemble.IsolationForest`](https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.IsolationForest.html) for several structural reasons:

| Criterion | Isolation Forest | Discarded Alternatives |
|---|---|---|
| **Labeled Data** | ❌ Not required (unsupervised) | One-Class SVM, Autoencoders require more data |
| **Real-time** | ✅ Inference in $O(\log n)$ | LOF recalculates neighbors for each point |
| **Low Training Volume** | ✅ Robust | Autoencoders overfit easily |
| **Interpretability** | ✅ Score = isolation depth | Neural networks = black box |

### How does the algorithm work?

Isolation Forest generates a forest of **1,000 random decision trees** and attempts to *isolate* each data point by randomly partitioning the feature space.

- A **normal** data point is buried in the mass → requires *many* splits to be isolated → **high depth**.
- An **anomaly** (traffic spike, erratic behavior) is structurally different → isolated in *very few* steps → **low depth**.

It is this isolation depth that mathematically defines the `IF_Score` returned by `decision_function()`.

**Key Hyperparameters** (see [`train_model.py`](./train_model.py#L97)):

```python
IsolationForest(
    n_estimators=1000,   # 1,000 trees → minimal score variance
    contamination=0.01,  # Assumption: ~1% of training points are outliers
    max_features=1.0,    # All features used at each split
    random_state=42,     # Guaranteed reproducibility
    n_jobs=-1            # Parallelization across all available cores
)
```
---

## 3. Feature Engineering: The 11 Indicators

To provide the AI with a multidimensional view, the 3 raw metrics are transformed into a vector space of **11 indicators** divided into four families.

### Features Table

| # | Feature | Family | Formula | Role |
|---|---|---|---|---|
| 1 | `cpu` | Raw | — | Instantaneous CPU load (%) |
| 2 | `ram` | Raw | — | Instantaneous RAM usage (%) |
| 3 | `network` | Raw | — | Instantaneous network throughput |
| 4 | `cpu_delta` | Speed | $CPU_t - CPU_{t-1}$ | Detects sudden CPU accelerations |
| 5 | `ram_delta` | Speed | $RAM_t - RAM_{t-1}$ | Detects rapid memory increases |
| 6 | `net_delta` | Speed | $NET_t - NET_{t-1}$ | Detects network traffic spikes |
| 7 | `cpu_pressure` | Saturation | $\max(0,\ CPU_t - 85)$ | CPU pressure beyond the danger threshold |
| 8 | `ram_pressure` | Saturation | $\max(0,\ RAM_t - 85)$ | RAM pressure beyond the danger threshold |
| 9 | `ram_critical` | Saturation | $\max(0,\ RAM_t - 95)$ | Strong signal of critical RAM saturation |
| 10 | `combined_load` | Correlation | $(CPU \times 0.45) + (RAM \times 0.45) + (NET \times 0.10)$ | Overall systemic pressure index |
| 11 | `cpu_ram_ratio` | Correlation | $CPU_t\ /\ (RAM_t + 10^{-6})$ | Detects CPU/RAM imbalances |

### Why these families?

- **Raw Metrics:** The instantaneous state of the system. Necessary, but insufficient on their own.
- **Speed Indicators (Deltas):** For a Brute Force type attack, the *acceleration* of the load is more revealing than the absolute value. A sudden jump from 10% to 50% CPU is detected immediately.
- **Pressure Indicators (Saturation):** Measure the intensity *beyond* critical thresholds. They remain non-zero even if the deltas drop to zero (unlike raw metrics alone).
- **Correlation Indicators:** The `cpu_ram_ratio` identifies specific behavioral anomalies — for example, a compute-intensive process *without memory usage* (cryptocurrency mining, infinite loop). The `combined_load` captures the aggregated systemic pressure.


---

## 4. Training Strategy: Augmentation via Jittering

### Training Data

The model trains **exclusively** on the first 8 rows of [`scenario.csv`](./scenario.csv), which represent the server in a normal state (CPU ~10–12%, RAM ~20%, Network ~0.1).

### Problem: Overfitting on static data

With only 8 nearly identical points, the model would risk learning that normality is an *exact* value, rather than a *tolerance zone*. Any slight variation would trigger a false alarm.

### Solution: Jittering (Gaussian noise)

Gaussian noise is added to each feature of the training data:

$$Feature_{train} = Feature_{raw} + \mathcal{N}(\mu=0,\ \sigma^2)$$

With the following standard deviations (see [`train_model.py`](./train_model.py#L62)):

| Feature | $\sigma$ (added noise) |
|---|---|
| `cpu` | 0.8% |
| `ram` | 0.5% |
| `network` | 0.05 |

This technique teaches the AI that "normality" is a **multidimensional tolerance zone**, and not a fixed point.

### Normalization

After augmentation, the features are normalized via `StandardScaler` (mean = 0, standard deviation = 1) so that large-scale features do not dominate others during tree partitioning.

---

## 5. Hybrid Decision System (ML + Expert Rules)

### The blind spot of pure AI: Concept Drift

If an anomaly *persists* (e.g., a memory leak blocking RAM at 99% for an hour), the deltas drop back to zero. The probabilistic model may then tolerate this state as a "new normal" — this is the phenomenon of **Concept Drift**.

### The Solution: The Hybrid Score

The final risk merges the ML score with **deterministic circuit breakers** based on absolute physical saturation:

$$Risk_{total} = Risk_{AI} + Bonus_{CPU} + Bonus_{RAM}$$

**Conversion of Isolation Forest score → risk (0–100):**

$$Risk_{AI} = (0.15 - IF\_Score) \times 400$$

**RAM saturation bonus (circuit breaker):**

$$Bonus_{RAM} = \begin{cases} \left(\frac{RAM_t - 95}{100 - 95}\right) \times 45 & \text{if } RAM_t \geq 95\% \text{ (max +45 pts)} \\ \left(\frac{RAM_t - 85}{95 - 85}\right) \times 20 & \text{if } RAM_t \geq 85\% \text{ (max +20 pts)} \end{cases}$$

**CPU saturation bonus:**

$$Bonus_{CPU} = \left(\frac{CPU_t - 85}{100 - 85}\right) \times 20 \quad \text{if } CPU_t \geq 85\% \text{ (max +20 pts)}$$

**Alert Levels:**

| Score | Level | Color |
|---|---|---|
| > 70 | 🔴 CRITICAL | Red |
| 40 – 70 | 🟠 WARNING | Orange |
| < 40 | 🟢 Normal | Green |

**Key Result:** A guaranteed RAM saturation at 99% generates a +45 pt bonus on the score, systematically overriding the probabilistic judgment. This ensures **zero tolerance** for critical physical failures, regardless of the model's internal state.

---

## 6. Known Limitations

| Limitation | Description | Impact |
|---|---|---|
| **Cold Start** | The model trains on only 8 points. Its baseline is fragile early in its lifecycle. | Possible false positives during the first minutes of inference |
| **Concept Drift** | Partially mitigated by the hybrid score, but a sustained change in normal load (e.g., server scaling) can skew AI predictions | Periodic retraining recommended |
| **Contamination parameter** | Empirically set to 1%. If too low, the model will be too permissive; if too high, too sensitive. | Needs adjustment according to the actual server profile |
| **Static test data** | The [`scenario.csv`](./scenario.csv) is a manually simulated 18-row file. It does not cover all real attack vectors. | Unrepresented anomalies may be under-detected |
| **Lack of temporal dimension** | Isolation Forest does not model sequences. Cyclical patterns (cron jobs, hourly peaks) may be misclassified. | An evolution towards a sequential model (LSTM Autoencoder) could be considered |