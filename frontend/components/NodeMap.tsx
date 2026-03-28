export default function NodeMap() {
  return (
    <div style={{ background: "var(--surface-container-low)", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", display: "flex", flexDirection: "column", height: 400 }}>
      <div style={{ padding: "12px 16px", background: "var(--surface-container-high)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ fontFamily: "var(--font-label)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--on-surface-variant)", margin: 0 }}>
          Global Mesh Node Location
        </h3>
        <span className="material-symbols-outlined" style={{ color: "var(--primary)", fontSize: 16 }}>location_on</span>
      </div>
      <div style={{ flex: 1, position: "relative", background: "#cbd5e1", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #0f4c81 0%, #1e6091 30%, #134874 60%, #0c3547 100%)", opacity: 0.85 }} />
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 30% 50%, rgba(6,182,212,0.15) 0%, transparent 60%), radial-gradient(circle at 70% 30%, rgba(0,102,112,0.2) 0%, transparent 50%)" }} />
        
        {/* Pulse marker */}
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}>
          <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div className="animate-ping" style={{ position: "absolute", width: 48, height: 48, borderRadius: "50%", background: "rgba(0,102,112,0.2)" }} />
            <div style={{ width: 16, height: 16, background: "var(--primary)", border: "2px solid #fff", borderRadius: "50%", position: "relative", boxShadow: "0 4px 12px rgba(0,0,0,0.4)" }} />
          </div>
        </div>

        {/* Coord label */}
        <div style={{ position: "absolute", bottom: 16, left: 16, background: "rgba(248,250,251,0.9)", backdropFilter: "blur(8px)", padding: 12, borderRadius: 8, border: "1px solid rgba(188,201,203,0.3)", maxWidth: 200 }}>
          <p style={{ fontSize: 10, fontFamily: "var(--font-label)", fontWeight: 700, color: "var(--on-surface)", textTransform: "uppercase", margin: "0 0 2px" }}>Active Node Coord</p>
          <p style={{ fontSize: 12, fontFamily: "monospace", color: "var(--primary)", margin: 0 }}>64.1265° N, 21.8174° W</p>
        </div>
      </div>
    </div>
  );
}