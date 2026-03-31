"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  checkBackendStatus,
  getLiveSystemStats,
  getHistory,
  type AlertLevel,
  type StatsPayload,
  type HistoryEntry,
} from "@/lib/api";
import NeuralPredict from "./NeuralPredict";
import KernelLogs    from "./KernelLogs";
import NodeMap       from "./NodeMap";
import Telemetry     from "./Telemetry";

// ── Types ─────────────────────────────────────────────────────────────────────

interface DashboardProps {
  /** Node courant sélectionné depuis la Sidebar */
  activeNode:   string;
  /** Callback permettant à la Sidebar de connaître l'alerte de chaque node */
  onAlertChange?: (nodeId: string, alert: AlertLevel) => void;
  /** Pour le switch de node depuis la NodeMap */
  onSelectNode?: (nodeId: string) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Dashboard({ activeNode, onAlertChange, onSelectNode }: DashboardProps) {
  const [apiStatus, setApiStatus]     = useState<"connecting" | "online" | "offline">("connecting");
  const [lastPrediction, setLastPred] = useState<StatsPayload | null>(null);
  const [metrics, setMetrics]         = useState({ cpu: 0, ram: 0, network: 0 });
  const [history, setHistory]         = useState<HistoryEntry[]>([]);

  // Track the node for which data is currently loaded (to detect switches)
  const loadedNodeRef = useRef<string>("");

  // ── 1. Healthcheck au démarrage ────────────────────────────────────────────
  useEffect(() => {
    checkBackendStatus().then(({ status }) => setApiStatus(status === "online" ? "online" : "offline"));
  }, []);

  // ── 2. Rechargement de l'historique quand le node actif change ─────────────
  useEffect(() => {
    if (apiStatus !== "online") return;
    if (loadedNodeRef.current === activeNode) return;

    loadedNodeRef.current = activeNode;
    setMetrics({ cpu: 0, ram: 0, network: 0 });
    setLastPred(null);

    getHistory(activeNode).then(hist => {
      if (!hist?.length) { setHistory([]); return; }
      setHistory(hist);
      const last = hist[hist.length - 1];
      if (last) setMetrics({ cpu: last.cpu, ram: last.ram, network: last.network ?? 0 });
    });
  }, [apiStatus, activeNode]);

  // ── 3. Boucle de polling temps réel ────────────────────────────────────────
  useEffect(() => {
    if (apiStatus !== "online") return;

    const tick = async () => {
      const data = await getLiveSystemStats(activeNode);
      if (!data) return;

      setMetrics({ cpu: data.cpu, ram: data.ram, network: data.network ?? 0 });
      setLastPred(data);

      // Remonte l'alerte courante à la Sidebar via le callback
      onAlertChange?.(data.node_id, data.alert_level);

      setHistory(prev => [
        ...prev.slice(-49),
        {
          node_id:       data.node_id,
          cpu:           data.cpu,
          ram:           data.ram,
          network:       data.network ?? 0,
          cpu_delta:     data.cpu_delta,
          ram_delta:     data.ram_delta,
          combined_load: data.combined_load,
          is_anomaly:    data.is_anomaly,
          ai_risk_score: data.ai_risk_score,
          alert_level:   data.alert_level,
          timestamp:     data.timestamp,
        },
      ]);
    };

    const id = setInterval(tick, 2000);
    return () => clearInterval(id);
  }, [apiStatus, activeNode, onAlertChange]);

  // ── Dérivés ────────────────────────────────────────────────────────────────
  const statusColor = apiStatus === "online" ? "#22c55e" : "#ef4444";

  return (
    <>
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "flex-start", marginBottom: 32,
        flexWrap: "wrap", gap: 16,
      }}>
        <div>
          <h1 style={{
            fontSize: 36, fontWeight: 700, margin: 0,
            fontFamily: "var(--font-headline)", color: "var(--on-surface)",
          }}>
            NODE: {activeNode.toUpperCase()}
          </h1>
          <p style={{ color: "var(--on-surface-variant)", fontFamily: "var(--font-label)", margin: "4px 0 0" }}>
            Live AI Predictive Monitoring — Agent-Driven Mode
          </p>
        </div>

        {/* Status badge */}
        <div style={{
          background: `${statusColor}18`,
          padding: "8px 16px", borderRadius: 8,
          display: "flex", alignItems: "center", gap: 12,
          border: `1px solid ${statusColor}`,
          alignSelf: "center",
        }}>
          <div
            className={apiStatus === "online" ? "animate-pulse" : ""}
            style={{ width: 8, height: 8, borderRadius: "50%", background: statusColor }}
          />
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--on-surface)", fontFamily: "var(--font-label)" }}>
            {apiStatus === "online" ? "LIVE PREDICTIVE LINK ACTIVE" : "AI ENGINE OFFLINE"}
          </span>
        </div>
      </div>

      {/* ── Main grid ───────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 24 }}>
        <section style={{ gridColumn: "span 8", display: "flex", flexDirection: "column", gap: 24 }}>
          <NeuralPredict metrics={metrics} prediction={lastPrediction} history={history} />
          <KernelLogs prediction={lastPrediction} activeNode={activeNode} />
        </section>

        <section style={{ gridColumn: "span 4", display: "flex", flexDirection: "column", gap: 16 }}>
          <NodeMap activeNode={activeNode} onSelectNode={onSelectNode} />
          <Telemetry metrics={metrics} activeNode={activeNode} />
        </section>
      </div>
    </>
  );
}