"use client";

import { useEffect, useState, useCallback } from "react";
import { BrainCircuit, ShieldAlert, Terminal, Zap, Radio, RefreshCw } from "lucide-react";
import { getNodes, type NodeMeta, type AlertLevel } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SidebarProps {
  activeNode:    string;
  onSelectNode:  (nodeId: string) => void;
  /** Map node_id → current alert level (mis à jour par le Dashboard) */
  nodeAlerts?:   Record<string, AlertLevel>;
}

// ── Constants ────────────────────────────────────────────────────────────────

const ALERT_STYLE: Record<AlertLevel, { dot: string; badge: string; bg: string }> = {
  OK:       { dot: "#22c55e", badge: "#22c55e", bg: "rgba(34,197,94,0.08)"  },
  WARNING:  { dot: "#eab308", badge: "#eab308", bg: "rgba(234,179,8,0.10)"  },
  CRITICAL: { dot: "#ef4444", badge: "#ef4444", bg: "rgba(239,68,68,0.10)"  },
};

const DISCOVERY_INTERVAL_MS = 5_000; // interroge /api/nodes toutes les 5s

// ── Component ─────────────────────────────────────────────────────────────────

export default function Sidebar({ activeNode, onSelectNode, nodeAlerts = {} }: SidebarProps) {
  const [nodes, setNodes]         = useState<NodeMeta[]>([]);
  const [lastRefresh, setRefresh] = useState<Date | null>(null);
  const [isPolling, setPolling]   = useState(false);

  // ── Discovery loop ─────────────────────────────────────────────────────────
  const discover = useCallback(async () => {
    setPolling(true);
    const fresh = await getNodes();
    if (fresh.length > 0) {
      // Fusionne en préservant l'ordre d'apparition
      setNodes(prev => {
        const known = new Set(prev.map(n => n.node_id));
        const added = fresh.filter(n => !known.has(n.node_id));
        return added.length ? [...prev, ...added] : prev;
      });
      setRefresh(new Date());
    }
    setPolling(false);
  }, []);

  useEffect(() => {
    discover();
    const id = setInterval(discover, DISCOVERY_INTERVAL_MS);
    return () => clearInterval(id);
  }, [discover]);

  // ── Render ─────────────────────────────────────────────────────────────────

  const navItems = [
    { icon: <BrainCircuit size={18} />, label: "Neural Analytics" },
    { icon: <ShieldAlert  size={18} />, label: "Threat Logs"      },
    { icon: <Terminal     size={18} />, label: "System Config"    },
  ];

  return (
    <aside style={{
      height: "calc(100vh - 64px)", width: 256,
      position: "fixed", left: 0, top: 64,
      background: "#f1f5f9", borderRight: "1px solid #e2e8f0",
      display: "flex", flexDirection: "column",
      overflowY: "auto", zIndex: 40,
    }}>

      {/* ── Branding ─────────────────────────────────────────────────────── */}
      <div style={{ padding: 24 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: "#155e75", textTransform: "uppercase", letterSpacing: "0.15em", margin: 0 }}>
          Synthetic Watchman
        </h2>
        <p style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.2em", margin: "4px 0 0" }}>
          V.3.0.0-STABLE | AERO_MODE
        </p>
      </div>

      {/* ── Active Nodes (Plug & Play) ────────────────────────────────────── */}
      <div style={{ padding: "0 12px 8px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px 6px" }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.15em" }}>
            Active Nodes
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {isPolling && (
              <RefreshCw size={10} color="#94a3b8" style={{ animation: "spin 1s linear infinite" }} />
            )}
            <span style={{
              fontSize: 9, fontWeight: 700,
              color: nodes.length > 0 ? "#22c55e" : "#94a3b8",
              background: nodes.length > 0 ? "rgba(34,197,94,0.1)" : "rgba(148,163,184,0.1)",
              padding: "1px 6px", borderRadius: 9999,
              border: `1px solid ${nodes.length > 0 ? "rgba(34,197,94,0.3)" : "rgba(148,163,184,0.3)"}`,
            }}>
              {nodes.length} online
            </span>
          </div>
        </div>

        {/* Empty state */}
        {nodes.length === 0 ? (
          <div style={{
            margin: "8px 4px",
            padding: "16px 12px",
            background: "rgba(148,163,184,0.08)",
            border: "1px dashed rgba(148,163,184,0.4)",
            borderRadius: 8,
            textAlign: "center",
          }}>
            <Radio size={20} color="#94a3b8" style={{ margin: "0 auto 8px" }} />
            <p style={{ fontSize: 10, color: "#94a3b8", margin: 0, lineHeight: 1.5 }}>
              Aucun agent connecté
            </p>
            <p style={{ fontSize: 9, color: "#cbd5e1", margin: "4px 0 0", fontFamily: "monospace" }}>
              python watchman_agent.py<br />--node my_server --file data.csv
            </p>
          </div>
        ) : (
          /* Node buttons */
          nodes.map(node => {
            const alert   = nodeAlerts[node.node_id] ?? "OK";
            const style   = ALERT_STYLE[alert];
            const isActive = node.node_id === activeNode;

            return (
              <button
                key={node.node_id}
                onClick={() => onSelectNode(node.node_id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  padding: "10px 16px",
                  borderRadius: 8,
                  border: isActive
                    ? `1px solid ${style.dot}55`
                    : "1px solid transparent",
                  background: isActive ? style.bg : "transparent",
                  cursor: "pointer",
                  marginBottom: 3,
                  textAlign: "left",
                  transition: "all 0.2s ease",
                }}
              >
                {/* Status dot */}
                <span style={{
                  flexShrink: 0,
                  width: 8, height: 8, borderRadius: "50%",
                  background: style.dot,
                  boxShadow: isActive ? `0 0 6px ${style.dot}` : "none",
                  transition: "box-shadow 0.3s",
                }} />

                {/* Labels */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: 11, fontWeight: isActive ? 700 : 600,
                    color: isActive ? "#0e7490" : "#475569",
                    textTransform: "uppercase", letterSpacing: "0.06em",
                    margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {node.node_id}
                  </p>
                  <p style={{
                    fontSize: 9, color: "#94a3b8", margin: 0,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {node.label}
                  </p>
                </div>

                {/* Alert badge */}
                {alert !== "OK" && (
                  <span style={{
                    fontSize: 7, fontWeight: 800,
                    color: style.badge,
                    background: `${style.badge}18`,
                    border: `1px solid ${style.badge}44`,
                    padding: "1px 5px", borderRadius: 9999,
                    flexShrink: 0, letterSpacing: "0.05em",
                  }}>
                    {alert}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>

      {/* ── Static nav ────────────────────────────────────────────────────── */}
      <nav style={{ flex: 1, padding: "8px 12px", borderTop: "1px solid #e2e8f0" }}>
        {navItems.map(item => (
          <a
            key={item.label}
            href="#"
            style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 16px", borderRadius: 8,
              fontSize: 11, fontWeight: 600,
              textTransform: "uppercase", letterSpacing: "0.1em",
              textDecoration: "none", color: "#64748b",
              background: "transparent", marginBottom: 2,
            }}
          >
            {item.icon}
            <span>{item.label}</span>
          </a>
        ))}
      </nav>

      {/* ── Footer buttons ────────────────────────────────────────────────── */}
      <div style={{ padding: 16, borderTop: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: 10 }}>
        {lastRefresh && (
          <p style={{ fontSize: 9, color: "#94a3b8", textAlign: "center", margin: 0, fontFamily: "monospace" }}>
            Sync: {lastRefresh.toLocaleTimeString()}
          </p>
        )}
        <button style={{
          width: "100%", padding: "10px",
          background: "#0e7490", color: "#fff",
          border: "none", borderRadius: 8,
          fontWeight: 700, fontSize: 11, cursor: "pointer",
          textTransform: "uppercase", letterSpacing: "0.1em",
        }}>
          Deploy Node
        </button>
        <button style={{
          width: "100%", padding: "10px",
          background: "#fef2f2", color: "#ef4444",
          border: "1px solid #fecaca", borderRadius: 8,
          fontWeight: 700, fontSize: 10, cursor: "pointer",
          textTransform: "uppercase", letterSpacing: "0.1em",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}>
          <Zap size={14} /> Emergency Killswitch
        </button>
      </div>

      {/* Spin animation */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </aside>
  );
}