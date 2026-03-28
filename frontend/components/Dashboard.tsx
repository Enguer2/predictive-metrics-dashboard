"use client";

import NeuralPredict from "./NeuralPredict";
import KernelLogs from "./KernelLogs";
import NodeMap from "./NodeMap";
import Telemetry from "./Telemetry";

export default function Dashboard() {
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 36, fontWeight: 700, margin: 0, fontFamily: "var(--font-headline)", color: "var(--on-surface)" }}>NODE: CLUSTER_01</h1>
          <p style={{ color: "var(--on-surface-variant)", fontFamily: "var(--font-label)" }}>Satellite Relay / Northern Sector Deployment</p>
        </div>
        <div style={{ background: "var(--surface-container-high)", padding: "8px 16px", borderRadius: 8, display: "flex", alignItems: "center", gap: 12 }}>
          <div className="animate-pulse" style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e" }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--on-surface)", fontFamily: "var(--font-label)" }}>LIVE PREDICTIVE LINK ACTIVE</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 24 }}>
        <section style={{ gridColumn: "span 8", display: "flex", flexDirection: "column", gap: 24 }}>
          <NeuralPredict />
          <KernelLogs />
        </section>

        <section style={{ gridColumn: "span 4", display: "flex", flexDirection: "column", gap: 24 }}>
          <NodeMap />
          <Telemetry />
        </section>
      </div>
    </>
  );
}