"use client";

import { useState, useEffect, useRef } from "react";

interface NeuralPredictProps {
  metrics: { cpu: number; ram: number; network: number };
  prediction: any;
  history: any[];
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  data: { cpu: number; ram: number; network: number; risk: number; alert: string; timestamp?: string } | null;
}

export default function NeuralPredict({ metrics, prediction, history }: NeuralPredictProps) {
  const [isMounted, setIsMounted] = useState(true);
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0, data: null });
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // ── BUG FIX 1 : ai_risk_score peut être 0 (falsy) — on utilise ?? au lieu de ||
  const displayRisk   = isMounted ? (prediction?.ai_risk_score ?? 0) : 0;
  const alertLevel    = prediction?.alert_level ?? "OK"; // "OK" | "WARNING" | "CRITICAL"

  const displayCpu     = isMounted ? metrics.cpu     : 0;
  const displayRam     = isMounted ? metrics.ram     : 0;
  const displayNetwork = isMounted ? metrics.network : 0;

  const isAnomaly = prediction?.is_anomaly || false;

  // ── BUG FIX 2 : couleur basée sur alert_level du backend, pas uniquement sur displayRisk
  // displayRisk peut rester à 0 si ai_risk_score n'est pas encore propagé dans lastPrediction
  let aiStatusColor = "#22c55e";
  let aiStatusNote  = "System Nominal";
  let aiDisplayValue = "OK";

  if (alertLevel === "CRITICAL" || displayRisk > 70) {
    aiStatusColor  = "#ef4444";
    aiStatusNote   = "CRITICAL: Pattern mismatch!";
    aiDisplayValue = "ALERT";
  } else if (alertLevel === "WARNING" || displayRisk > 35) {
    aiStatusColor  = "#eab308";
    aiStatusNote   = "WARNING: Unusual behavior detected";
    aiDisplayValue = "WARN";
  }

  const risks = [
    {
      label: "CPU Utilization",
      value: displayCpu,
      displayValue: displayCpu.toFixed(1),
      unit: "%",
      max: 100,
      color: displayCpu > 85 ? "#ef4444" : displayCpu > 70 ? "#eab308" : "var(--primary)",
      note: "Live processor load",
    },
    {
      label: "RAM Consumption",
      value: displayRam,
      displayValue: displayRam.toFixed(1),
      unit: "%",
      max: 100,
      color: displayRam > 95 ? "#ef4444" : displayRam > 85 ? "#eab308" : "var(--primary)",
      note: "Physical memory allocation",
    },
    {
      label: "Network Bandwidth",
      value: displayNetwork,
      displayValue: displayNetwork.toFixed(2),
      unit: " Gbps",
      max: 1.5,
      color: displayNetwork > 1.2 ? "#ef4444" : displayNetwork > 1.0 ? "#eab308" : "var(--primary)",
      note: "Live Data Throughput",
    },
    {
      label: "AI Anomaly Status",
      value: displayRisk,
      displayValue: aiDisplayValue,
      unit: "",
      max: 100,
      color: aiStatusColor,
      note: aiStatusNote,
      bold: displayRisk > 35 || alertLevel !== "OK",
    },
  ];

  // ── Build bars from history (most recent 50 points)
  const bars = Array.from({ length: 50 }).map((_, i) => {
    const pt = history && history[i];

    let barColor = "rgba(34,197,94,0.15)"; // vert pâle = normal
    if (pt) {
      const risk  = pt.ai_risk_score ?? 0;
      const level = pt.alert_level   ?? "OK";
      if (level === "CRITICAL" || risk > 70) barColor = "rgba(239,68,68,0.65)";
      else if (level === "WARNING" || risk > 35) barColor = "rgba(234,179,8,0.65)";
      else barColor = "rgba(34,197,94,0.25)";
    }

    return {
      h:     isMounted ? (pt ? Math.max(5, pt.cpu) : 5) : 5,
      color: barColor,
      data:  pt ?? null,
    };
  });

  // ── Tooltip handlers
  const handleBarEnter = (
    e: React.MouseEvent<HTMLDivElement>,
    data: typeof bars[0]["data"]
  ) => {
    if (!data) return;
    const rect = chartRef.current?.getBoundingClientRect();
    const barRect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      visible: true,
      // position relative to the chart container
      x: barRect.left - (rect?.left ?? 0) + barRect.width / 2,
      y: barRect.top  - (rect?.top  ?? 0) - 8,
      data: {
        cpu:       data.cpu       ?? 0,
        ram:       data.ram       ?? 0,
        network:   data.network   ?? 0,
        risk:      data.ai_risk_score ?? 0,
        alert:     data.alert_level   ?? "OK",
        timestamp: data.timestamp,
      },
    });
  };

  const handleBarLeave = () => setTooltip(t => ({ ...t, visible: false }));

  // tooltip alert color
  const tooltipAlertColor =
    tooltip.data?.alert === "CRITICAL" ? "#ef4444"
    : tooltip.data?.alert === "WARNING" ? "#eab308"
    : "#22c55e";

  return (
    <div style={{ background: "var(--surface-container-low)", borderRadius: 12, padding: 24, display: "flex", flexDirection: "column", gap: 24 }}>
      {/* ── Header ── */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(188,201,203,0.2)", paddingBottom: 16 }}>
        <h2 style={{ fontFamily: "var(--font-headline)", fontSize: 20, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
          <span className="material-symbols-outlined" style={{ color: isAnomaly ? "#ef4444" : "var(--primary)" }}>psychology</span>
          Neural Incident Prediction
        </h2>
        <span style={{
          fontSize: 10, fontFamily: "var(--font-label)", fontWeight: 700,
          color: aiStatusColor,
          padding: "4px 10px",
          background: `${aiStatusColor}18`,
          border: `1px solid ${aiStatusColor}55`,
          borderRadius: 9999,
          transition: "all 0.4s ease",
        }}>
          {alertLevel}
        </span>
      </header>

      {/* ── Metric cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
        {risks.map(({ label, value, displayValue, unit, max, color, note, bold }) => (
          <div
            key={label}
            style={{
              background: "var(--surface-container-lowest)",
              padding: 20,
              borderRadius: 8,
              borderBottom: `2px solid ${color}`,
              boxShadow: `0 0 0 0 ${color}`,
              outline: `1px solid ${color}22`,
              transition: "all 0.4s ease",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <span style={{ fontFamily: "var(--font-label)", fontSize: 11, fontWeight: 700, color: "var(--on-surface-variant)", textTransform: "uppercase" }}>
                {label}
              </span>
              <span style={{ color, fontWeight: 700, fontFamily: "var(--font-headline)", fontSize: 20, transition: "color 0.4s ease" }}>
                {displayValue}{unit}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ height: 4, width: "100%", background: "var(--surface-container-high)", borderRadius: 9999, overflow: "hidden" }}>
                <div style={{ background: color, width: `${Math.min(100, (value / max) * 100)}%`, height: "100%", transition: "width 0.6s ease, background 0.4s ease" }} />
              </div>
              <p style={{ fontSize: 10, color: bold ? color : "var(--on-surface-variant)", fontWeight: bold ? 700 : 400, margin: 0, transition: "color 0.4s ease" }}>
                {note}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── History chart with tooltip ── */}
      <div
        ref={chartRef}
        style={{
          height: 160,
          background: "var(--surface-container-highest)",
          borderRadius: 8,
          position: "relative",
          overflow: "visible",          // allow tooltip to overflow
          display: "flex",
          alignItems: "flex-end",
          padding: "0 12px",
          gap: 2,
        }}
      >
        {/* Labels */}
        <div style={{ position: "absolute", inset: 0, padding: 12, display: "flex", justifyContent: "space-between", pointerEvents: "none", zIndex: 10 }}>
          <span style={{ fontSize: 9, fontFamily: "var(--font-label)", color: "rgba(61,73,75,0.6)", fontWeight: 700 }}>
            NEURAL HISTORY FEED — hover bar for details
          </span>
          <span style={{ fontSize: 9, fontFamily: "var(--font-label)", color: isAnomaly ? "#ef4444" : "#22c55e", fontWeight: 700 }}>
            {isAnomaly ? "⚠ PATTERN ANOMALY DETECTED" : "● SYSTEM OPERATIONAL"}
          </span>
        </div>

        {/* Bars */}
        {bars.map((bar, i) => (
          <div
            key={i}
            onMouseEnter={e => handleBarEnter(e, bar.data)}
            onMouseLeave={handleBarLeave}
            style={{
              flex: 1,
              background: bar.color,
              height: `${Math.max(5, bar.h)}%`,
              borderRadius: "1px 1px 0 0",
              transition: "height 0.4s ease, background 0.4s ease",
              cursor: bar.data ? "crosshair" : "default",
              position: "relative",
            }}
          />
        ))}

        {/* Tooltip */}
        {tooltip.visible && tooltip.data && (
          <div
            style={{
              position: "absolute",
              left: tooltip.x,
              top: tooltip.y,
              transform: "translate(-50%, -100%)",
              background: "#0a0e14",
              border: `1px solid ${tooltipAlertColor}55`,
              borderRadius: 8,
              padding: "10px 14px",
              zIndex: 100,
              pointerEvents: "none",
              minWidth: 160,
              boxShadow: `0 4px 24px rgba(0,0,0,0.5), 0 0 8px ${tooltipAlertColor}22`,
            }}
          >
            {tooltip.data.timestamp && (
              <p style={{ margin: "0 0 6px", fontSize: 9, color: "#475569", fontFamily: "var(--font-label)", fontWeight: 700 }}>
                {tooltip.data.timestamp}
              </p>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {[
                { label: "CPU",     value: `${tooltip.data.cpu.toFixed(1)} %`,       color: tooltip.data.cpu > 85 ? "#ef4444" : "#94a3b8" },
                { label: "RAM",     value: `${tooltip.data.ram.toFixed(1)} %`,       color: tooltip.data.ram > 85 ? "#eab308" : "#94a3b8" },
                { label: "Network", value: `${tooltip.data.network.toFixed(2)} Gbps`, color: tooltip.data.network > 1.0 ? "#eab308" : "#94a3b8" },
                { label: "Risk",    value: `${tooltip.data.risk} %`,                  color: tooltipAlertColor },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 16, fontFamily: "var(--font-label)", fontSize: 10 }}>
                  <span style={{ color: "#475569", fontWeight: 700 }}>{label}</span>
                  <span style={{ color, fontWeight: 700 }}>{value}</span>
                </div>
              ))}
              <div style={{
                marginTop: 4,
                padding: "2px 6px",
                background: `${tooltipAlertColor}22`,
                borderRadius: 4,
                textAlign: "center",
                fontSize: 9,
                fontWeight: 800,
                color: tooltipAlertColor,
                fontFamily: "var(--font-label)",
                letterSpacing: "0.1em",
              }}>
                {tooltip.data.alert}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}