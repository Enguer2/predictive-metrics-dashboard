"use client";

import { useState, useEffect } from "react";

interface NeuralPredictProps {
  metrics: { cpu: number; ram: number; network: number };
  prediction: any;
  history: any[];
}

export default function NeuralPredict({ metrics, prediction, history }: NeuralPredictProps) {
  const [isMounted, setIsMounted] = useState(false);

  const isAnomaly = prediction?.is_anomaly || false;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // On utilise désormais le score réel envoyé par le backend au lieu du Math.random()
  const displayRisk = isMounted ? (prediction?.ai_risk_score || 0) : 0;
  
  const displayCpu = isMounted ? metrics.cpu : 0;
  const displayRam = isMounted ? metrics.ram : 0;
  const displayNetwork = isMounted ? metrics.network : 0; 

  const risks = [
    { 
      label: "CPU Utilization", 
      value: displayCpu, 
      displayValue: displayCpu.toString(), 
      unit: "%",
      max: 100,
      color: displayCpu > 80 ? "#eab308" : "var(--primary)", 
      note: "Live processor load" 
    },
    { 
      label: "RAM Consumption", 
      value: displayRam, 
      displayValue: displayRam.toString(),
      unit: "%",
      max: 100,
      color: displayRam > 85 ? "#eab308" : "var(--primary)", 
      note: "Physical memory allocation" 
    },
    { 
      label: "Network Bandwidth", 
      value: displayNetwork, 
      displayValue: displayNetwork.toFixed(1), 
      unit: " Gbps",
      max: 1.5,
      color: displayNetwork > 1.0 ? "var(--error)" : "var(--primary)", 
      note: "Live Data Throughput" 
    },
    { 
      label: "AI Anomaly Score", 
      value: displayRisk, 
      displayValue: displayRisk.toString(),
      unit: "%",
      max: 100,
      color: isAnomaly ? "var(--error)" : "#22c55e", 
      note: isAnomaly ? "CRITICAL: Pattern mismatch!" : "Predictive engine: Normal", 
      bold: isAnomaly 
    },
  ];

  const bars = Array.from({ length: 50 }).map((_, i) => {
    const historicalPoint = history && history[i];
    return {
      h: isMounted ? (historicalPoint ? historicalPoint.cpu : 5) : 5,
      color: historicalPoint?.is_anomaly ? "rgba(186, 26, 26, 0.6)" : "rgba(0,102,112,0.2)"
    };
  });

  return (
    <div style={{ background: "var(--surface-container-low)", borderRadius: 12, padding: 24, display: "flex", flexDirection: "column", gap: 24 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(188,201,203,0.2)", paddingBottom: 16 }}>
        <h2 style={{ fontFamily: "var(--font-headline)", fontSize: 20, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
          <span className="material-symbols-outlined" style={{ color: isAnomaly ? "var(--error)" : "var(--primary)" }}>psychology</span>
          Neural Incident Prediction
        </h2>
        <span style={{ fontSize: 10, fontFamily: "var(--font-label)", fontWeight: 700, color: "var(--on-surface-variant)", padding: "4px 8px", background: "var(--surface-container-highest)", borderRadius: 9999 }}>
          REF: ENGINE_AI_v4.2 (MULTI-VARIATE)
        </span>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
        {risks.map(({ label, value, displayValue, unit, max, color, note, bold }) => (
          <div key={label} style={{ background: "var(--surface-container-lowest)", padding: 20, borderRadius: 8, borderBottom: `2px solid ${color}`, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", transition: "all 0.4s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <span style={{ fontFamily: "var(--font-label)", fontSize: 11, fontWeight: 700, color: "var(--on-surface-variant)", textTransform: "uppercase" }}>{label}</span>
              <span style={{ color, fontWeight: 700, fontFamily: "var(--font-headline)", fontSize: 20 }}>{displayValue}{unit}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ height: 4, width: "100%", background: "var(--surface-container-high)", borderRadius: 9999, overflow: "hidden" }}>
                <div style={{ background: color, width: `${(value / max) * 100}%`, height: "100%", transition: "width 0.6s ease" }} />
              </div>
              <p style={{ fontSize: 10, color: bold ? color : "var(--on-surface-variant)", fontWeight: bold ? 700 : 400, margin: 0 }}>
                {note}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div style={{ height: 160, background: "var(--surface-container-highest)", borderRadius: 8, position: "relative", overflow: "hidden", display: "flex", alignItems: "flex-end", padding: "0 12px", gap: 2 }}>
        <div style={{ position: "absolute", inset: 0, padding: 12, display: "flex", justifyContent: "space-between", pointerEvents: "none", zIndex: 10 }}>
          <span style={{ fontSize: 9, fontFamily: "var(--font-label)", color: "rgba(61,73,75,0.6)", fontWeight: 700 }}>NEURAL HISTORY FEED (50 pts - CPU REFERENCE)</span>
          <span style={{ fontSize: 9, fontFamily: "var(--font-label)", color: isAnomaly ? "var(--error)" : "#22c55e", fontWeight: 700 }}>
            {isAnomaly ? "PATTERN ANOMALY DETECTED" : "SYSTEM OPERATIONAL"}
          </span>
        </div>
        {bars.map((bar, i) => (
          <div key={i} style={{ flex: 1, background: bar.color, height: `${Math.max(5, bar.h)}%`, borderRadius: "1px 1px 0 0", transition: "height 0.4s ease, background 0.4s ease" }} />
        ))}
      </div>
    </div>
  );
}