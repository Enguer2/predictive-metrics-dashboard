"use client";

import { useEffect, useState } from "react";
import { getAllNodesStatus, type NodeStatus } from "@/lib/api";

interface NodeMapProps {
  activeNode:    string;
  onSelectNode?: (nodeId: string) => void;
}

const ALERT_COLOR: Record<string, string> = {
  OK:       "#22c55e",
  WARNING:  "#eab308",
  CRITICAL: "#ef4444",
};

export default function NodeMap({ activeNode, onSelectNode }: NodeMapProps) {
  const [nodes, setNodes] = useState<NodeStatus[]>([]);

  useEffect(() => {
    const loadNodes = async () => {
      const data = await getAllNodesStatus(); 
      if (data && data.length > 0) {
        setNodes(data);
      }
    };
    loadNodes();

    const id = setInterval(loadNodes, 5000);
    return () => clearInterval(id);
  }, []);

  // ── 1. GESTION DES POSITIONS (Anti-Superposition) ──
  const getProjectedNodes = () => {
    return nodes.map((node, index) => {
      if (node.lat !== 0 || node.lon !== 0) {
        return {
          ...node,
          x: ((node.lon + 180) / 360) * 300,
          y: ((90 - node.lat) / 180) * 220,
        };
      }
      
      const centerX = 150;
      const centerY = 110;
      const angle = (index / nodes.length) * Math.PI * 2;
      const radius = 45 + (index % 4) * 15; 
      
      return {
        ...node,
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
      };
    });
  };

  const projectedNodes = getProjectedNodes();

  return (
    <div style={{
      background: "var(--surface-container-low)",
      borderRadius: 12,
      overflow: "hidden",
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      display: "flex",
      flexDirection: "column",
      height: 400,
    }}>
      {/* Header */}
      <div style={{
        padding: "12px 16px",
        background: "var(--surface-container-high)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <h3 style={{
          fontFamily: "var(--font-label)", fontSize: 11, fontWeight: 700,
          textTransform: "uppercase", letterSpacing: "0.12em",
          color: "var(--on-surface-variant)", margin: 0,
        }}>
          Global Mesh Node Location
        </h3>
        <span className="material-symbols-outlined" style={{ color: "var(--primary)", fontSize: 16 }}>
          location_on
        </span>
      </div>

      {/* Map */}
      <div style={{ flex: 1, position: "relative", background: "#0c3547", overflow: "hidden" }}>
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(135deg, #0f4c81 0%, #1e6091 30%, #134874 60%, #0c3547 100%)",
          opacity: 0.85,
        }} />
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "radial-gradient(circle at 30% 50%, rgba(6,182,212,0.15) 0%, transparent 60%), radial-gradient(circle at 70% 30%, rgba(0,102,112,0.2) 0%, transparent 50%)",
        }} />

        <svg
          viewBox="0 0 300 220"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 2 }}
        >
          {projectedNodes.map((p1, i) =>
            projectedNodes.slice(i + 1).map((p2, j) => {
              const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
              if (dist < 85) {
                return (
                  <line
                    key={`link-${i}-${j}`}
                    x1={p1.x} y1={p1.y}
                    x2={p2.x} y2={p2.y}
                    stroke="rgba(255, 255, 255, 0.2)"
                    strokeWidth={1}
                    strokeDasharray="2 3"
                  />
                );
              }
              return null;
            })
          )}

          {projectedNodes.map(node => {
            const color    = ALERT_COLOR[node.alert_level] ?? "#22c55e";
            const isActive = node.node_id === activeNode;

            return (
              <g
                key={node.node_id}
                transform={`translate(${node.x},${node.y})`}
                style={{ cursor: "pointer" }}
                onClick={() => onSelectNode?.(node.node_id)}
              >
                {/* Ping ring */}
                <circle r={isActive ? 14 : 10} fill={`${color}22`} className="animate-ping" />
                {/* Solid dot */}
                <circle
                  r={isActive ? 7 : 5}
                  fill={color}
                  stroke={isActive ? "#fff" : "rgba(255,255,255,0.4)"}
                  strokeWidth={isActive ? 2 : 1}
                />
                {/* Node label */}
                <text
                  y={-12}
                  textAnchor="middle"
                  fontSize={isActive ? 7 : 6}
                  fill="#fff"
                  fontFamily="monospace"
                  fontWeight={isActive ? 800 : 400}
                  opacity={0.9}
                >
                  {node.node_id.toUpperCase()}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Active node info card */}
        {nodes.length > 0 && (() => {
          const active = projectedNodes.find(n => n.node_id === activeNode) ?? projectedNodes[0];
          const color  = ALERT_COLOR[active.alert_level] ?? "#22c55e";
          return (
            <div style={{
              position: "absolute", bottom: 16, left: 16, right: 16,
              background: "rgba(248,250,251,0.9)",
              backdropFilter: "blur(8px)",
              padding: 12, borderRadius: 8,
              border: `1px solid ${color}55`,
              zIndex: 10,
            }}>
              <p style={{ fontSize: 10, fontFamily: "var(--font-label)", fontWeight: 700, color: "var(--on-surface)", textTransform: "uppercase", margin: "0 0 2px" }}>
                {active.node_id.toUpperCase()} — {active.label}
              </p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <p style={{ fontSize: 11, fontFamily: "monospace", color: "var(--primary)", margin: 0 }}>
                  {/* Différencie l'affichage si c'est dynamique ou physique */}
                  {active.lat !== 0 
                    ? `${active.lat.toFixed(4)}° N, ${active.lon.toFixed(4)}° W` 
                    : "DYNAMIC CLUSTER MESH"}
                </p>
                <span style={{
                  fontSize: 9, fontWeight: 800, fontFamily: "var(--font-label)",
                  color: color,
                  padding: "2px 8px",
                  background: `${color}18`,
                  border: `1px solid ${color}55`,
                  borderRadius: 9999,
                }}>
                  {active.alert_level}
                </span>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}