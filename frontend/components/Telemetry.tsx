import React from "react";

interface TelemetryProps {
  metrics:    { cpu: number; ram: number; network: number };
  activeNode: string;
}

export default function Telemetry({ metrics, activeNode }: TelemetryProps) {
  const m = metrics ?? { cpu: 0, ram: 0, network: 0 };

  const stats = [
    {
      icon: "speed",
      label: "Throughput",
      value: `${m.network.toFixed(2)} Gbps`,
      trend: m.network > 0.5 ? "trending_up" : "horizontal_rule",
      trendColor: m.network > 0.8 ? "var(--error)" : "#22c55e",
    },
    {
      icon: "memory",
      label: "RAM Usage",
      value: `${m.ram.toFixed(1)}%`,
      trend: m.ram > 80 ? "trending_up" : "horizontal_rule",
      trendColor: m.ram > 85 ? "var(--error)" : "var(--on-surface-variant)",
    },
    {
      icon: "developer_board",
      label: "CPU Load",
      value: `${m.cpu.toFixed(1)}%`,
      trend: m.cpu > 80 ? "trending_up" : "horizontal_rule",
      trendColor: m.cpu > 85 ? "var(--error)" : "#22c55e",
    },
  ];

  return (
    <div style={{
      background: "var(--surface-container-low)", borderRadius: 12, padding: 24,
      display: "flex", flexDirection: "column", gap: 16,
    }}>
      <h3 style={{
        fontFamily: "var(--font-label)", fontSize: 11, fontWeight: 700,
        textTransform: "uppercase", letterSpacing: "0.12em",
        color: "var(--on-surface-variant)", margin: 0,
      }}>
        Live Telemetry — {activeNode.toUpperCase()}
      </h3>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {stats.map(({ icon, label, value, trend, trendColor }) => (
          <div
            key={label}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: 12, background: "var(--surface-container-lowest)", borderRadius: 8,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span className="material-symbols-outlined" style={{ color: "var(--primary)", fontSize: 22 }}>{icon}</span>
              <div>
                <p style={{ fontSize: 10, fontFamily: "var(--font-label)", color: "var(--on-surface-variant)", lineHeight: 1, margin: "0 0 4px" }}>
                  {label}
                </p>
                <p style={{ fontWeight: 700, fontFamily: "var(--font-headline)", color: "var(--on-surface)", margin: 0 }}>
                  {value}
                </p>
              </div>
            </div>
            <span
              className="material-symbols-outlined fill-icon"
              style={{ color: trendColor, fontSize: 16, transition: "color 0.3s ease" }}
            >
              {trend}
            </span>
          </div>
        ))}
      </div>

      <button
        style={{
          width: "100%", padding: "8px 0",
          background: "var(--secondary-container)",
          color: "var(--on-secondary-container)",
          fontFamily: "var(--font-label)", fontSize: 12, fontWeight: 700,
          borderRadius: 8, border: "none", cursor: "pointer",
          transition: "opacity 0.2s",
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = "0.8")}
        onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
        onClick={() => window.open(`http://localhost:8000/history/${activeNode}`, "_blank")}
      >
        DOWNLOAD RAW METRICS
      </button>
    </div>
  );
}