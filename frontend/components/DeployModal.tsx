"use client";
import { useState, useEffect } from "react";
import {
  X, Rocket, FileText, Server, Clock, RefreshCw,
  CheckCircle, AlertTriangle, Database, ChevronRight,
} from "lucide-react";
import { getScenarios, getSessionId, type ScenarioEntry } from "@/lib/api";


const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface DeployModalProps {
  onClose:     () => void;
  onDeployed?: (nodeId: string) => void;
}

type DeployStatus = "idle" | "loading" | "success" | "error";
type FetchStatus  = "loading" | "ready" | "empty" | "error";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Déduit une couleur d'accent à partir du nom du fichier. */
function scenarioColor(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.includes("attack") || lower.includes("ddos") || lower.includes("intrusion")) return "#ef4444";
  if (lower.includes("stress") || lower.includes("load") || lower.includes("spike"))    return "#eab308";
  if (lower.includes("normal") || lower.includes("baseline") || lower.includes("idle")) return "#22c55e";
  return "#06b6d4";
}

/** "attack_scenario.csv" → "Attack Scenario" */
function scenarioLabel(filename: string): string {
  return filename
    .replace(/\.csv$/i, "")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());
}

/** Description courte basée sur les mots-clés du nom. */
function scenarioDesc(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.includes("attack") || lower.includes("ddos"))     return "High-stress anomaly injection";
  if (lower.includes("intrusion"))                            return "Network intrusion simulation";
  if (lower.includes("stress") || lower.includes("spike"))    return "Progressive load ramp-up";
  if (lower.includes("normal") || lower.includes("baseline")) return "Baseline CPU/RAM simulation";
  if (lower.includes("idle"))                                 return "Low-activity idle state";
  return "Custom scenario";
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DeployModal({ onClose, onDeployed }: DeployModalProps) {
  // Scenario fetch
  const [scenarios,    setScenarios]   = useState<ScenarioEntry[]>([]);
  const [fetchStatus,  setFetchStatus] = useState<FetchStatus>("loading");

  // Form
  const [nodeId,       setNodeId]      = useState("");
  const [selected,     setSelected]    = useState<ScenarioEntry | null>(null);
  const [interval,     setIntervalVal] = useState("2.0");
  const [loop,         setLoop]        = useState(true);

  // Deploy
  const [deployStatus, setDeployStatus] = useState<DeployStatus>("idle");
  const [result,       setResult]       = useState<{ pid?: number; message?: string; error?: string } | null>(null);

  // ── Load scenarios on mount ───────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setFetchStatus("loading");

    getScenarios()
      .then(data => {
        if (cancelled) return;
        const valid = data.filter(s => s.has_required);
        setScenarios(valid);
        setFetchStatus(valid.length === 0 ? "empty" : "ready");
        if (valid.length > 0) setSelected(valid[0]);
      })
      .catch(() => {
        if (!cancelled) setFetchStatus("error");
      });

    return () => { cancelled = true; };
  }, []);

  // ── Deploy ────────────────────────────────────────────────────────────────
  const handleDeploy = async () => {
    if (!nodeId.trim() || !selected) return;
    setDeployStatus("loading");
    setResult(null);

    try {
      const sessionId = getSessionId();
      const res = await fetch(`${API_URL}/api/nodes/deploy`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Session-Id": sessionId
        },
        body: JSON.stringify({
          node_id:       nodeId.trim().toLowerCase().replace(/\s+/g, "_"),
          scenario_file: selected.path,
          interval:      parseFloat(interval) || 2.0,
          loop,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDeployStatus("error");
        setResult({ error: data.detail ?? "Deployment failed." });
        return;
      }
      setDeployStatus("success");
      setResult({ pid: data.pid, message: data.message });
      onDeployed?.(data.node_id);
    } catch {
      setDeployStatus("error");
      setResult({ error: "Cannot reach backend. Is it running?" });
    }
  };

  const canDeploy = !!nodeId.trim() && !!selected && deployStatus === "idle";

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(10, 14, 20, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: "fadeIn 0.15s ease",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 520, maxWidth: "calc(100vw - 32px)",
          background: "#f8fafb",
          borderRadius: 16,
          border: "1px solid #e2e8f0",
          boxShadow: "0 24px 64px rgba(0,0,0,0.25)",
          overflow: "hidden",
          animation: "slideUp 0.2s ease",
          maxHeight: "calc(100vh - 48px)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div style={{
          background: "linear-gradient(135deg, #0e7490 0%, #006670 100%)",
          padding: "20px 24px",
          display: "flex", justifyContent: "space-between", alignItems: "flex-start",
          flexShrink: 0,
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <Rocket size={18} color="#67e8f9" />
              <h2 style={{ margin: 0, color: "#fff", fontFamily: "var(--font-headline)", fontSize: 18, fontWeight: 700 }}>
                Deploy Node
              </h2>
            </div>
            <p style={{ margin: 0, color: "rgba(255,255,255,0.65)", fontFamily: "var(--font-label)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em" }}>
              Provision a new monitoring agent
            </p>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8, padding: 6, cursor: "pointer", display: "flex", color: "#fff" }}>
            <X size={16} />
          </button>
        </div>

        {/* ── Scrollable body ──────────────────────────────────────────── */}
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 22, overflowY: "auto" }}>

          {/* Node ID */}
          <div>
            <label style={labelStyle}>
              <Server size={12} style={{ marginRight: 6 }} />
              Node Identifier
            </label>
            <input
              value={nodeId}
              onChange={e => setNodeId(e.target.value)}
              placeholder="e.g. node_paris, cluster_06"
              disabled={deployStatus !== "idle"}
              style={inputStyle}
            />
            <p style={hintStyle}>Lowercase, underscores allowed. Auto-registered on first data push.</p>
          </div>

          {/* Scenario picker */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>
                <Database size={12} style={{ marginRight: 6 }} />
                Scenario — /dataset
              </label>
              {fetchStatus === "ready" && (
                <span style={{
                  fontSize: 9, fontFamily: "var(--font-label)", fontWeight: 700,
                  color: "#22c55e", background: "rgba(34,197,94,0.1)",
                  border: "1px solid rgba(34,197,94,0.25)",
                  padding: "2px 8px", borderRadius: 9999,
                }}>
                  {scenarios.length} file{scenarios.length !== 1 ? "s" : ""} found
                </span>
              )}
            </div>

            {/* Loading */}
            {fetchStatus === "loading" && (
              <div style={stateBoxStyle}>
                <RefreshCw size={18} color="#94a3b8" style={{ animation: "spin 0.9s linear infinite", flexShrink: 0 }} />
                <p style={{ ...stateTextStyle, margin: 0 }}>Scanning /dataset directory…</p>
              </div>
            )}

            {/* Error */}
            {fetchStatus === "error" && (
              <div style={{ ...stateBoxStyle, borderColor: "rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.04)" }}>
                <AlertTriangle size={18} color="#ef4444" style={{ flexShrink: 0 }} />
                <div>
                  <p style={{ ...stateTextStyle, color: "#b91c1c", margin: "0 0 2px", fontWeight: 700 }}>Cannot reach backend</p>
                  <p style={{ ...stateTextStyle, margin: 0, fontSize: 9 }}>Make sure the FastAPI server is running.</p>
                </div>
              </div>
            )}

            {/* Empty */}
            {fetchStatus === "empty" && (
              <div style={stateBoxStyle}>
                <Database size={18} color="#94a3b8" style={{ flexShrink: 0 }} />
                <div>
                  <p style={{ ...stateTextStyle, margin: "0 0 2px", fontWeight: 700 }}>No valid CSV found in /dataset</p>
                  <p style={{ ...stateTextStyle, margin: 0, fontSize: 9, fontFamily: "monospace" }}>
                    Files must contain cpu, ram, network columns.
                  </p>
                </div>
              </div>
            )}

            {/* Scenario list */}
            {fetchStatus === "ready" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 240, overflowY: "auto" }}>
                {scenarios.map(scenario => {
                  const isSelected = selected?.filename === scenario.filename;
                  const color      = scenarioColor(scenario.filename);

                  return (
                    <button
                      key={scenario.filename}
                      onClick={() => setSelected(scenario)}
                      disabled={deployStatus !== "idle"}
                      style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "12px 14px", borderRadius: 10,
                        border: `1px solid ${isSelected ? color + "55" : "#e2e8f0"}`,
                        background: isSelected ? `${color}0d` : "#fff",
                        cursor: "pointer", textAlign: "left",
                        transition: "all 0.18s ease", outline: "none",
                      }}
                    >
                      {/* Color dot */}
                      <div style={{
                        width: 10, height: 10, borderRadius: "50%",
                        background: color, flexShrink: 0,
                        boxShadow: isSelected ? `0 0 8px ${color}99` : "none",
                        transition: "box-shadow 0.2s",
                      }} />

                      {/* Labels */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          margin: 0, fontSize: 12, fontWeight: 700,
                          color: isSelected ? "#0e7490" : "#334155",
                          fontFamily: "var(--font-label)",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {scenarioLabel(scenario.filename)}
                        </p>
                        <p style={{ margin: "2px 0 0", fontSize: 10, color: "#94a3b8", fontFamily: "var(--font-label)" }}>
                          {scenarioDesc(scenario.filename)}
                        </p>
                      </div>

                      {/* Meta */}
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, flexShrink: 0 }}>
                        <span style={metaBadgeStyle}>{scenario.row_count.toLocaleString()} rows</span>
                        <span style={metaBadgeStyle}>{scenario.size_kb} KB</span>
                      </div>

                      <ChevronRight size={14} color={isSelected ? color : "#cbd5e1"} style={{ flexShrink: 0, transition: "color 0.2s" }} />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Selected path pill */}
            {selected && fetchStatus === "ready" && (
              <div style={{
                marginTop: 8, padding: "6px 10px",
                background: "rgba(14,116,144,0.06)",
                border: "1px solid rgba(14,116,144,0.2)",
                borderRadius: 6, display: "flex", alignItems: "center", gap: 6, overflow: "hidden",
              }}>
                <FileText size={10} color="#0e7490" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 9, fontFamily: "monospace", color: "#0e7490", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {selected.path}
                </span>
              </div>
            )}
          </div>

          {/* Interval + Loop */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={labelStyle}>
                <Clock size={12} style={{ marginRight: 6 }} />
                Interval (seconds)
              </label>
              <input
                type="number"
                value={interval}
                onChange={e => setIntervalVal(e.target.value)}
                min="0.5" max="60" step="0.5"
                disabled={deployStatus !== "idle"}
                style={{ ...inputStyle, marginBottom: 0 }}
              />
            </div>
            <div>
              <label style={labelStyle}>
                <RefreshCw size={12} style={{ marginRight: 6 }} />
                Loop mode
              </label>
              <button
                onClick={() => setLoop(l => !l)}
                disabled={deployStatus !== "idle"}
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: 8,
                  border: `1px solid ${loop ? "rgba(14,116,144,0.4)" : "#e2e8f0"}`,
                  background: loop ? "rgba(14,116,144,0.08)" : "#fff",
                  color: loop ? "#0e7490" : "#94a3b8",
                  fontFamily: "var(--font-label)", fontSize: 12, fontWeight: 700,
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                  transition: "all 0.2s",
                }}
              >
                <div style={{
                  width: 14, height: 14, borderRadius: 3,
                  border: `2px solid ${loop ? "#0e7490" : "#cbd5e1"}`,
                  background: loop ? "#0e7490" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  {loop && <div style={{ width: 6, height: 6, background: "#fff", borderRadius: 1 }} />}
                </div>
                {loop ? "Continuous loop" : "Run once"}
              </button>
            </div>
          </div>

          {/* Result banners */}
          {deployStatus === "success" && result && (
            <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 8, padding: "12px 16px", display: "flex", alignItems: "flex-start", gap: 10 }}>
              <CheckCircle size={16} color="#22c55e" style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 11, color: "#166534", fontFamily: "var(--font-label)" }}>Agent deployed — PID {result.pid}</p>
                <p style={{ margin: "2px 0 0", fontSize: 10, color: "#15803d", fontFamily: "var(--font-label)" }}>{result.message}</p>
              </div>
            </div>
          )}

          {deployStatus === "error" && result && (
            <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "12px 16px", display: "flex", alignItems: "flex-start", gap: 10 }}>
              <AlertTriangle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ margin: 0, fontSize: 11, color: "#b91c1c", fontFamily: "var(--font-label)" }}>{result.error}</p>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
            {deployStatus !== "success" ? (
              <>
                <button onClick={onClose} style={{ flex: 1, padding: "11px", background: "#fff", color: "#64748b", border: "1px solid #e2e8f0", borderRadius: 8, fontFamily: "var(--font-label)", fontSize: 12, fontWeight: 700, cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Cancel
                </button>
                <button
                  onClick={handleDeploy}
                  disabled={!canDeploy}
                  style={{
                    flex: 2, padding: "11px",
                    background: canDeploy ? "linear-gradient(135deg, #0e7490, #006670)" : "#e2e8f0",
                    color: canDeploy ? "#fff" : "#94a3b8",
                    border: "none", borderRadius: 8,
                    fontFamily: "var(--font-label)", fontSize: 12, fontWeight: 700,
                    cursor: canDeploy ? "pointer" : "not-allowed",
                    textTransform: "uppercase", letterSpacing: "0.08em",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    transition: "all 0.2s",
                  }}
                >
                  {deployStatus === "loading" ? (
                    <><RefreshCw size={14} style={{ animation: "spin 0.8s linear infinite" }} /> Deploying…</>
                  ) : (
                    <><Rocket size={14} /> Launch Agent</>
                  )}
                </button>
              </>
            ) : (
              <button onClick={onClose} style={{ flex: 1, padding: "11px", background: "linear-gradient(135deg, #0e7490, #006670)", color: "#fff", border: "none", borderRadius: 8, fontFamily: "var(--font-label)", fontSize: 12, fontWeight: 700, cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Close
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn  { from { opacity: 0 }                              to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(16px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        @keyframes spin    { from { transform: rotate(0deg) }                 to { transform: rotate(360deg) } }
      `}</style>
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: "flex", alignItems: "center",
  fontSize: 10, fontWeight: 700,
  color: "#64748b", fontFamily: "var(--font-label)",
  textTransform: "uppercase", letterSpacing: "0.12em",
  marginBottom: 8,
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px",
  border: "1px solid #e2e8f0", borderRadius: 8,
  fontFamily: "var(--font-label)", fontSize: 12,
  color: "#0f172a", background: "#fff",
  outline: "none", boxSizing: "border-box",
};

const hintStyle: React.CSSProperties = {
  fontSize: 9, color: "#94a3b8",
  fontFamily: "var(--font-label)", margin: "6px 0 0",
};

const stateBoxStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 12,
  padding: "14px 16px",
  background: "rgba(148,163,184,0.06)",
  border: "1px dashed rgba(148,163,184,0.35)",
  borderRadius: 10,
};

const stateTextStyle: React.CSSProperties = {
  fontSize: 11, color: "#94a3b8",
  fontFamily: "var(--font-label)",
};

const metaBadgeStyle: React.CSSProperties = {
  fontSize: 8, fontWeight: 700,
  color: "#94a3b8",
  background: "rgba(148,163,184,0.12)",
  border: "1px solid rgba(148,163,184,0.2)",
  padding: "1px 6px", borderRadius: 9999,
  fontFamily: "var(--font-label)",
  letterSpacing: "0.04em",
};