"use client";

import { useState, useEffect } from "react";

interface NeuralPredictProps {
  metrics: { cpu: number; ram: number };
  prediction: any;
}

export default function NeuralPredict({ metrics, prediction }: NeuralPredictProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [anomalyRisk, setAnomalyRisk] = useState(0);

  const isAnomaly = prediction?.is_anomaly || false;

  // 1. On s'assure que le composant est monté côté client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 2. On calcule le risque seulement quand on est sur le client
  useEffect(() => {
    if (isMounted) {
      const risk = isAnomaly 
        ? Math.floor(Math.random() * 20) + 80 
        : Math.floor(Math.random() * 30);
      setAnomalyRisk(risk);
    }
  }, [isAnomaly, prediction, isMounted]);

  // Si on n'est pas encore monté, on affiche une version "squelette" ou fixe
  // pour éviter tout décalage entre Serveur et Client
  const displayRisk = isMounted ? anomalyRisk : 0;
  const displayCpu = isMounted ? metrics.cpu : 0;
  const displayRam = isMounted ? metrics.ram : 0;

  const risks = [
    { 
      label: "CPU Utilization", 
      value: displayCpu, 
      color: displayCpu > 80 ? "#eab308" : "var(--primary)", 
      note: "Live processor load" 
    },
    { 
      label: "RAM Consumption", 
      value: displayRam, 
      color: displayRam > 85 ? "#eab308" : "var(--primary)", 
      note: "Physical memory allocation" 
    },
    { 
      label: "AI Anomaly Score", 
      value: displayRisk, 
      color: isAnomaly ? "var(--error)" : "#22c55e", 
      note: isAnomaly ? "CRITICAL: Pattern mismatch!" : "Predictive engine: Normal", 
      bold: isAnomaly 
    },
  ];

  const bars = Array.from({ length: 10 }).map((_, i) => ({
    h: isMounted ? Math.max(15, i % 2 === 0 ? metrics.cpu : metrics.ram) : 15,
    color: isAnomaly ? "rgba(186, 26, 26, 0.4)" : "rgba(0,102,112,0.2)"
  }));

  return (
    <div style={{ background: "var(--surface-container-low)", borderRadius: 12, padding: 24, display: "flex", flexDirection: "column", gap: 24 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(188,201,203,0.2)", paddingBottom: 16 }}>
        <h2 style={{ fontFamily: "var(--font-headline)", fontSize: 20, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
          <span className="material-symbols-outlined" style={{ color: isAnomaly ? "var(--error)" : "var(--primary)" }}>psychology</span>
          Neural Incident Prediction
        </h2>
        <span style={{ fontSize: 10, fontFamily: "var(--font-label)", fontWeight: 700, color: "var(--on-surface-variant)", padding: "4px 8px", background: "var(--surface-container-highest)", borderRadius: 9999 }}>
          REF: ENGINE_AI_v4.2
        </span>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {risks.map(({ label, value, color, note, bold }) => (
          <div key={label} style={{ background: "var(--surface-container-lowest)", padding: 20, borderRadius: 8, borderBottom: `2px solid ${color}`, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", transition: "all 0.4s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <span style={{ fontFamily: "var(--font-label)", fontSize: 11, fontWeight: 700, color: "var(--on-surface-variant)", textTransform: "uppercase" }}>{label}</span>
              <span style={{ color, fontWeight: 700, fontFamily: "var(--font-headline)", fontSize: 20 }}>{value}%</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ height: 4, width: "100%", background: "var(--surface-container-high)", borderRadius: 9999, overflow: "hidden" }}>
                <div style={{ background: color, width: `${value}%`, height: "100%", transition: "width 0.6s ease" }} />
              </div>
              <p style={{ fontSize: 10, color: bold ? color : "var(--on-surface-variant)", fontWeight: bold ? 700 : 400, margin: 0 }}>
                {note}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div style={{ height: 160, background: "var(--surface-container-highest)", borderRadius: 8, position: "relative", overflow: "hidden", display: "flex", alignItems: "flex-end", padding: "0 12px", gap: 4 }}>
        <div style={{ position: "absolute", inset: 0, padding: 12, display: "flex", justifyContent: "space-between", pointerEvents: "none" }}>
          <span style={{ fontSize: 9, fontFamily: "var(--font-label)", color: "rgba(61,73,75,0.4)", fontWeight: 700 }}>AI ANALYTICS FEED</span>
          <span style={{ fontSize: 9, fontFamily: "var(--font-label)", color: isAnomaly ? "var(--error)" : "#22c55e", fontWeight: 700 }}>
            {isAnomaly ? "PATTERN ANOMALY DETECTED" : "SYSTEM OPERATIONAL"}
          </span>
        </div>
        {bars.map((bar, i) => (
          <div key={i} style={{ flex: 1, background: bar.color, height: `${bar.h}%`, borderRadius: "2px 2px 0 0", transition: "height 0.4s ease, background 0.4s ease" }} />
        ))}
      </div>
    </div>
  );
}