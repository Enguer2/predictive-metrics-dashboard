"""
watchman_agent.py
─────────────────────────────────────────────────────────────
Usage :
    python watchman_agent.py --node node_paris --file data/normal_traffic.csv
    python watchman_agent.py --node node_berlin --file data/attack_scenario.csv --interval 2.0 --backend http://localhost:8000

Arguments :
    --node      Identifiant unique du serveur simulé (ex: node_paris)
    --file      Chemin vers le fichier CSV de scénario (colonnes : cpu, ram, network)
    --interval  Délai en secondes entre chaque envoi  (défaut : 2.0)
    --backend   URL de base du backend                (défaut : http://localhost:8000)
    --loop      Si présent, repart au début du CSV quand il est épuisé
"""

import argparse
import csv
import time
import sys
import os
import requests

# ─────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────
def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="WATCHMAN_OS — Agent de monitoring déporté",
        formatter_class=argparse.RawTextHelpFormatter,
    )
    parser.add_argument(
        "--node",
        required=True,
        help="Identifiant unique du serveur (ex: node_paris, cluster_01)",
    )
    parser.add_argument(
        "--file",
        required=True,
        help="Chemin vers le fichier CSV contenant les colonnes : cpu, ram, network",
    )
    parser.add_argument(
        "--interval",
        type=float,
        default=2.0,
        help="Délai entre chaque envoi en secondes (défaut : 2.0)",
    )
    parser.add_argument(
        "--backend",
        default=os.getenv("WATCHMAN_BACKEND_URL", "http://localhost:8000"),
        help="URL de base du backend FastAPI (défaut : http://localhost:8000)",
    )
    parser.add_argument(
        "--loop",
        action="store_true",
        help="Reboucle sur le CSV indéfiniment (simulation continue)",
    )
    parser.add_argument(
        "--session",
        default="anonymous",
        help="ID de la session frontend",
        )
    return parser.parse_args()


# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────
BOLD   = "\033[1m"
GREEN  = "\033[32m"
YELLOW = "\033[33m"
RED    = "\033[31m"
CYAN   = "\033[36m"
RESET  = "\033[0m"

def log(level: str, msg: str) -> None:
    ts = time.strftime("%H:%M:%S")
    colors = {"INFO": GREEN, "WARN": YELLOW, "ERR": RED, "SEND": CYAN}
    color = colors.get(level, RESET)
    print(f"[{ts}] {color}{BOLD}{level:4s}{RESET}  {msg}")


def load_csv(filepath: str) -> list[dict]:
    """Charge le CSV et valide les colonnes obligatoires."""
    if not os.path.exists(filepath):
        log("ERR", f"Fichier introuvable : {filepath}")
        sys.exit(1)

    rows = []
    with open(filepath, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        required = {"cpu", "ram", "network"}
        if not required.issubset(set(reader.fieldnames or [])):
            log("ERR", f"Le CSV doit contenir les colonnes : {required}. Trouvé : {reader.fieldnames}")
            sys.exit(1)
        for i, row in enumerate(reader):
            try:
                rows.append({
                    "cpu":     float(row["cpu"]),
                    "ram":     float(row["ram"]),
                    "network": float(row["network"]),
                })
            except ValueError as e:
                log("WARN", f"Ligne {i+2} ignorée (valeur invalide) : {e}")

    if not rows:
        log("ERR", "Le CSV est vide ou ne contient aucune ligne valide.")
        sys.exit(1)

    log("INFO", f"CSV chargé : {len(rows)} lignes — {filepath}")
    return rows


def wait_for_backend(url: str, retries: int = 15, delay: float = 3.0) -> None:
    """Attend que le backend soit disponible avant de commencer à envoyer."""
    log("INFO", f"Connexion au backend : {url}")
    for attempt in range(1, retries + 1):
        try:
            r = requests.get(f"{url}/", timeout=5)
            if r.status_code == 200:
                log("INFO", f"Backend en ligne ✅  (tentative {attempt})")
                return
        except requests.exceptions.ConnectionError:
            pass
        log("WARN", f"Backend indisponible — nouvel essai dans {delay}s ({attempt}/{retries})")
        time.sleep(delay)

    log("ERR", f"Impossible de joindre le backend après {retries} tentatives. Abandon.")
    sys.exit(1)


# ─────────────────────────────────────────────
# MAIN LOOP
# ─────────────────────────────────────────────
def run(args: argparse.Namespace) -> None:
    rows     = load_csv(args.file)
    endpoint = f"{args.backend}/api/report/{args.node}"
    headers = {"X-Session-ID": args.session}
    wait_for_backend(args.backend)

    log("INFO", f"Agent démarré — Node: {BOLD}{args.node}{RESET}  Endpoint: {endpoint}")
    log("INFO", f"Intervalle d'envoi : {args.interval}s   Boucle : {'oui' if args.loop else 'non'}")
    print("─" * 60)

    total_sent  = 0
    total_err   = 0
    pass_number = 0

    while True:
        pass_number += 1
        if pass_number > 1:
            if not args.loop:
                log("INFO", "Scénario terminé. Utilisez --loop pour reboucler.")
                break
            log("INFO", f"Rebouclage sur le CSV (passe #{pass_number})")

        for i, row in enumerate(rows):
            payload = {
                "cpu":     round(row["cpu"],     2),
                "ram":     round(row["ram"],     2),
                "network": round(row["network"], 4),
            }
            try:
                resp = requests.post(endpoint, json=payload, headers=headers, timeout=10)
                resp.raise_for_status()
                data = resp.json()

                alert   = data.get("alert_level", "OK")
                risk    = data.get("ai_risk_score", 0)
                anomaly = data.get("is_anomaly", False)

                alert_color = RED if alert == "CRITICAL" else YELLOW if alert == "WARNING" else GREEN
                flag = f"{alert_color}{BOLD}{alert:8s}{RESET}"

                log(
                    "SEND",
                    f"[{args.node}] ligne {i+1:4d}/{len(rows)} │ "
                    f"CPU={payload['cpu']:5.1f}%  RAM={payload['ram']:5.1f}%  "
                    f"NET={payload['network']:.3f}Gbps │ "
                    f"risk={risk:3d}%  {flag}"
                    + (f"  ⚠ ANOMALY" if anomaly else ""),
                )
                total_sent += 1

            except requests.exceptions.ConnectionError:
                log("ERR",  f"[{args.node}] Backend injoignable à la ligne {i+1}")
                total_err += 1
                time.sleep(args.interval * 2)
                continue
            except requests.exceptions.HTTPError as e:
                log("ERR",  f"[{args.node}] HTTP {e.response.status_code} — {e.response.text[:120]}")
                total_err += 1
            except Exception as e:
                log("ERR",  f"[{args.node}] Erreur inattendue : {e}")
                total_err += 1

            time.sleep(args.interval)

    print("─" * 60)
    log("INFO", f"Session terminée — {total_sent} envois réussis, {total_err} erreurs.")


# ─────────────────────────────────────────────
if __name__ == "__main__":
    try:
        run(parse_args())
    except KeyboardInterrupt:
        print()
        log("INFO", "Agent arrêté manuellement (CTRL+C).")
        sys.exit(0)