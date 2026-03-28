"use client";

import { useEffect, useState } from "react";
// Suppression de getAiPrediction (inutile ici) et ajout de getLiveSystemStats
import { checkBackendStatus, getLiveSystemStats } from "@/lib/api"; 
import NeuralPredict from "./NeuralPredict";
import KernelLogs from "./KernelLogs";
import NodeMap from "./NodeMap";
import Telemetry from "./Telemetry";

export default function Dashboard() {
  const [apiStatus, setApiStatus] = useState<"connecting" | "online" | "offline">("connecting");
  const [lastPrediction, setLastPrediction] = useState<any>(null);
  const [metrics, setMetrics] = useState({ cpu: 0, ram: 0 });

  // 1. Vérification de la connexion au démarrage
  useEffect(() => {
    async function verifyConnection() {
      const data = await checkBackendStatus();
      setApiStatus(data.status === "online" ? "online" : "offline");
    }
    verifyConnection();
  }, []);

  // 2. Boucle de monitoring réelle
  useEffect(() => {
    if (apiStatus !== "online") return;

    const fetchRealStats = async () => {
      const data = await getLiveSystemStats();
      
      if (data) {
        setMetrics({ cpu: data.cpu, ram: data.ram });
        setLastPrediction({ 
          is_anomaly: data.is_anomaly, 
          cpu: data.cpu, 
          ram: data.ram, 
          // On ajoute l'heure locale pour les logs
          timestamp: new Date().toLocaleTimeString() 
        });
      }
    };

    // On réduit l'intervalle à 2s pour plus de réactivité sur les vraies stats
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
          {/* On passe les données en PROPS aux composants */}
          <NeuralPredict metrics={metrics} prediction={lastPrediction} />
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