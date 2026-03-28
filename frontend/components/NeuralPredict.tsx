export default function NeuralPredict() {
  const risks = [
    { label: "Memory Leak", value: 12, color: "var(--primary)", note: "Nominal variance detected in slab allocation.", bold: false },
    { label: "Latency Degradation", value: 42, color: "#eab308", note: "Probability spike in packet re-transmission at 04:00Z.", bold: false },
    { label: "Thermal Variance", value: 89, color: "var(--error)", note: "Critical: Predicted thermal throttling in T-minus 12min.", bold: true },
  ];

  const bars = [
    { h: 30, color: "rgba(0,102,112,0.2)" }, { h: 45, color: "rgba(0,102,112,0.3)" },
    { h: 40, color: "rgba(0,102,112,0.25)" }, { h: 60, color: "rgba(0,102,112,0.4)" },
    { h: 85, color: "rgba(0,102,112,0.6)" }, { h: 70, color: "rgba(234,179,8,0.4)" },
    { h: 95, color: "rgba(186,26,26,0.5)" }, { h: 100, color: "rgba(186,26,26,0.7)" },
    { h: 80, color: "rgba(186,26,26,0.4)" }, { h: 40, color: "rgba(0,102,112,0.2)" },
  ];

  return (
    <div style={{ background: "var(--surface-container-low)", borderRadius: 12, padding: 24, display: "flex", flexDirection: "column", gap: 24 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(188,201,203,0.2)", paddingBottom: 16 }}>
        <h2 style={{ fontFamily: "var(--font-headline)", fontSize: 20, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
          <span className="material-symbols-outlined" style={{ color: "var(--primary)" }}>psychology</span>
          Neural Incident Prediction
        </h2>
        <span style={{ fontSize: 10, fontFamily: "var(--font-label)", fontWeight: 700, color: "var(--on-surface-variant)", padding: "4px 8px", background: "var(--surface-container-highest)", borderRadius: 9999 }}>
          REF: ENGINE_AI_v4.2
        </span>
      </header>

      {/* Risk Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {risks.map(({ label, value, color, note, bold }) => (
          <div key={label} style={{ background: "var(--surface-container-lowest)", padding: 20, borderRadius: 8, borderBottom: `2px solid ${color}`, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <span style={{ fontFamily: "var(--font-label)", fontSize: 12, fontWeight: 700, color: "var(--on-surface-variant)" }}>{label}</span>
              <span style={{ color, fontWeight: 700, fontFamily: "var(--font-headline)", fontSize: 18 }}>{value}%</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ height: 4, width: "100%", background: "var(--surface-container-high)", borderRadius: 9999, overflow: "hidden" }}>
                <div style={{ background: color, width: `${value}%`, height: "100%", transition: "width 0.8s ease" }} />
              </div>
              <p style={{ fontSize: 10, fontFamily: "var(--font-label)", color: bold ? color : "var(--on-surface-variant)", opacity: bold ? 1 : 0.7, fontStyle: "italic", fontWeight: bold ? 700 : 400, margin: 0 }}>
                {note}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div style={{ height: 192, background: "var(--surface-container-highest)", borderRadius: 8, position: "relative", overflow: "hidden", display: "flex", alignItems: "flex-end", padding: "0 16px", gap: 4 }}>
        <div style={{ position: "absolute", inset: 0, padding: 16, display: "flex", justifyContent: "space-between", pointerEvents: "none" }}>
          <span style={{ fontSize: 9, fontFamily: "var(--font-label)", color: "rgba(61,73,75,0.4)" }}>ANALYTICS TREND (24H)</span>
          <span style={{ fontSize: 9, fontFamily: "var(--font-label)", color: "rgba(61,73,75,0.4)" }}>98.4% ACCURACY</span>
        </div>
        {bars.map((bar, i) => (
          <div key={i} style={{ flex: 1, background: bar.color, height: `${bar.h}%`, borderRadius: "4px 4px 0 0" }} />
        ))}
      </div>
    </div>
  );
}