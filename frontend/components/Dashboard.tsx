"use client";

import { useEffect, useState } from "react";
// Assure-toi que getHistory et getLiveSystemStats sont mis à jour dans api.ts pour retourner 'network'
import { checkBackendStatus, getLiveSystemStats, getHistory } from "@/lib/api"; 
import NeuralPredict from "./NeuralPredict";
import KernelLogs from "./KernelLogs";
import NodeMap from "./NodeMap";
import Telemetry from "./Telemetry";

export default function Dashboard() {
  const [apiStatus, setApiStatus] = useState<"connecting" | "online" | "offline">("connecting");
  const [lastPrediction, setLastPrediction] = useState<any>(null);
  // ÉTAPE 1 : On ajoute 'network' dans le state initial
  const [metrics, setMetrics] = useState({ cpu: 0, ram: 0, network: 0 }); 
  const [history, setHistory] = useState<any[]>([]);

  // 1. Vérification de la connexion ET chargement de l'historique au démarrage
  useEffect(() => {
    async function initDashboard() {
      const statusData = await checkBackendStatus();
      
      if (statusData.status === "online") {
        setApiStatus("online");
        const historicalData = await getHistory();
        if (historicalData) {
          setHistory(historicalData);
          const lastEntry = historicalData[historicalData.length - 1];
          if (lastEntry) {
            // ÉTAPE 2 : On initialise avec network si dispo
            setMetrics({ cpu: lastEntry.cpu, ram: lastEntry.ram, network: lastEntry.network || 0 }); 
          }
        }
      } else {
        setApiStatus("offline");
      }
    }
    initDashboard();
  }, []);

  // 2. Boucle de monitoring temps réel (Direct)
  useEffect(() => {
    if (apiStatus !== "online") return;

    const fetchRealStats = async () => {
      const data = await getLiveSystemStats();
      
      if (data) {
        // ÉTAPE 3 : On met à jour le state metrics avec la donnée réseau reçue de l'API
        setMetrics({ cpu: data.cpu, ram: data.ram, network: data.network || 0 }); 
        setLastPrediction({ 
          is_anomaly:    data.is_anomaly, 
          ai_risk_score: data.ai_risk_score,   // ← manquait
          alert_level:   data.alert_level,     // ← manquait
          cpu:           data.cpu, 
          ram:           data.ram, 
          timestamp:     new Date().toLocaleTimeString() 
        });

        // On garde les 50 derniers points dans l'historique
        setHistory(prev => [...prev.slice(-49), {
          cpu:           data.cpu,
          ram:           data.ram,
          network:       data.network || 0,
          is_anomaly:    data.is_anomaly,
          ai_risk_score: data.ai_risk_score,   // ← manquait
          alert_level:   data.alert_level,     // ← manquait
          timestamp:     new Date().toLocaleTimeString()
        }]);
      }
    };

    const interval = setInterval(fetchRealStats, 2000); 
    return () => clearInterval(interval);
  }, [apiStatus]);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 36, fontWeight: 700, margin: 0, fontFamily: "var(--font-headline)", color: "var(--on-surface)" }}>
            NODE: CLUSTER_01
          </h1>
          <p style={{ color: "var(--on-surface-variant)", fontFamily: "var(--font-label)" }}>
            Satellite Relay / Northern Sector Deployment
          </p>
        </div>

        <div style={{ 
          background: apiStatus === "online" ? "rgba(34, 197, 94, 0.1)" : "rgba(186, 26, 26, 0.1)", 
          padding: "8px 16px", borderRadius: 8, display: "flex", alignItems: "center", gap: 12,
          border: `1px solid ${apiStatus === "online" ? "#22c55e" : "#ba1a1a"}`
        }}>
          <div className={apiStatus === "online" ? "animate-pulse" : ""} 
               style={{ width: 8, height: 8, borderRadius: "50%", background: apiStatus === "online" ? "#22c55e" : "#ba1a1a" }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--on-surface)", fontFamily: "var(--font-label)" }}>
            {apiStatus === "online" ? "LIVE PREDICTIVE LINK ACTIVE" : "AI ENGINE OFFLINE"}
          </span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 24 }}>
        <section style={{ gridColumn: "span 8", display: "flex", flexDirection: "column", gap: 24 }}>
          {/* L'orchestrateur passe les nouvelles metrics complètes au composant visuel */}
          <NeuralPredict metrics={metrics} prediction={lastPrediction} history={history} />
          <KernelLogs prediction={lastPrediction} />
        </section>

        <section style={{ gridColumn: "span 4", display: "flex", flexDirection: "column", gap: 24 }}>
          <NodeMap />
          <Telemetry />
        </section>
      </div>
    </>
  );
}