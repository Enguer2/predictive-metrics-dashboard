"use client";

import { LayoutDashboard, Server, BrainCircuit, ShieldAlert, Terminal, Zap } from "lucide-react";

export default function Sidebar() {
  const navItems = [
    { icon: <LayoutDashboard size={18} />, label: "Command Center", active: true },
    { icon: <Server size={18} />, label: "Edge Nodes" },
    { icon: <BrainCircuit size={18} />, label: "Neural Analytics" },
    { icon: <ShieldAlert size={18} />, label: "Threat Logs" },
    { icon: <Terminal size={18} />, label: "System Config" },
  ];

  return (
    <aside style={{ height: "calc(100vh - 64px)", width: 256, position: "fixed", left: 0, top: 64, background: "#f1f5f9", borderRight: "1px solid #e2e8f0", display: "flex", flexDirection: "column", overflowY: "auto", zIndex: 40 }}>
      {/* Header de la Sidebar */}
      <div style={{ padding: 24 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: "#155e75", textTransform: "uppercase", letterSpacing: "0.15em", margin: 0 }}>Synthetic Watchman</h2>
        <p style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.2em", margin: "4px 0 0" }}>V.2.4.0-STABLE | AERO_MODE</p>
      </div>

      {/* Navigation principale */}
      <nav style={{ flex: 1, padding: "0 12px" }}>
        {navItems.map((item, i) => (
          <a
            key={item.label}
            href="#"
            style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", textDecoration: "none", color: item.active ? "#0e7490" : "#64748b", background: item.active ? "rgba(14,116,144,0.08)" : "transparent", marginBottom: 4 }}
          >
            {item.icon}
            <span>{item.label}</span>
          </a>
        ))}
      </nav>

      {/* Section basse de la Sidebar (Boutons) */}
      <div style={{ padding: 24, borderTop: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: 12 }}>
        <button style={{ width: "100%", padding: "12px", background: "#0e7490", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.1em" }}>
          Deploy Node
        </button>
        <button style={{ width: "100%", padding: "12px", background: "#fef2f2", color: "#ef4444", border: "1px solid #fecaca", borderRadius: 8, fontWeight: 700, fontSize: 10, cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.1em", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Zap size={14} /> Emergency Killswitch
        </button>
      </div>
    </aside>
  );
}