"use client";

import { useEffect, useState, useCallback } from "react";
import { BrainCircuit, ShieldAlert, Terminal, Zap, Radio, RefreshCw } from "lucide-react";
import { getNodes, killNode, type NodeMeta, type AlertLevel } from "@/lib/api";
import DeployModal from "@/components/DeployModal";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SidebarProps {
  activeNode:    string;
  onSelectNode:  (nodeId: string) => void;
  /** Map node_id → current alert level (mis à jour par le Dashboard) */
  nodeAlerts?:   Record<string, AlertLevel>;
  /** Callback déclenché après un killswitch pour forcer un re-select */
  onNodeKilled?: (killedNodeId: string) => void;
}

// ── Constants ────────────────────────────────────────────────────────────────

const ALERT_STYLE: Record<AlertLevel, { dot: string; badge: string; bg: string }> = {
  OK:       { dot: "#22c55e", badge: "#22c55e", bg: "rgba(34,197,94,0.08)"  },
  WARNING:  { dot: "#eab308", badge: "#eab308", bg: "rgba(234,179,8,0.10)"  },
  CRITICAL: { dot: "#ef4444", badge: "#ef4444", bg: "rgba(239,68,68,0.10)"  },
};

const DISCOVERY_INTERVAL_MS = 5_000;

// ── Component ─────────────────────────────────────────────────────────────────

export default function Sidebar({ activeNode, onSelectNode, nodeAlerts = {}, onNodeKilled }: SidebarProps) {
  const [nodes,       setNodes]       = useState<NodeMeta[]>([]);
  const [lastRefresh, setRefresh]     = useState<Date | null>(null);
  const [isPolling,   setPolling]     = useState(false);
  const [showDeploy,  setShowDeploy]  = useState(false);

  // Killswitch state
  const [killTarget,  setKillTarget]  = useState<string | null>(null); // node en cours de confirmation
  const [killing,     setKilling]     = useState<string | null>(null); // node en cours d'exécution
  const [killResult,  setKillResult]  = useState<{ nodeId: string; success: boolean; msg: string } | null>(null);

  // ── Discovery loop ─────────────────────────────────────────────────────────
  // FIX 1 : Remplacement complet de la liste (au lieu d'un append-only)
  // afin que les nodes supprimés via killswitch disparaissent réellement
  // du sidebar lors du prochain poll, sans être réinjectés.
  const discover = useCallback(async () => {
    setPolling(true);
    const fresh = await getNodes();
    // On remplace toujours la liste complète — y compris quand elle est vide
    // après un killswitch — pour refléter fidèlement l'état réel du backend.
    setNodes(fresh);
    setRefresh(new Date());
    setPolling(false);
  }, []);

  useEffect(() => {
    discover();
    const id = setInterval(discover, DISCOVERY_INTERVAL_MS);
    return () => clearInterval(id);
  }, [discover]);

  // ── Killswitch logic ───────────────────────────────────────────────────────
  // FIX 2 : Utilisation de killNode() depuis api.ts au lieu d'un fetch brut,
  // ce qui garantit l'envoi du header X-Session-ID requis par le backend
  // pour filtrer et purger uniquement les données de la session courante.
  // FIX 1 (suite) : Suppression optimiste immédiate de la node côté UI avant
  // la réponse serveur, pour éviter qu'un tick de discover() la réinsère
  // pendant la durée de la requête DELETE.
  const handleKillswitch = async () => {
    const target = killTarget ?? activeNode;
    setKillTarget(null);
    setKilling(target);
    setKillResult(null);

    // Suppression optimiste immédiate : on retire la node de la liste locale
    // avant même que le backend réponde, pour qu'un tick discover() intermédiaire
    // ne la réintroduise pas pendant la durée de l'appel réseau.
    setNodes(prev => prev.filter(n => n.node_id !== target));

    // killNode() envoie le header X-Session-ID via getSessionId() (cf. api.ts)
    const data = await killNode(target);

    if (data) {
      setKillResult({
        nodeId:  target,
        success: true,
        msg:     `${data.deleted_rows} records purged. Agent stopped.`,
      });
      // Notifie le parent pour changer de node active si besoin
      onNodeKilled?.(target);
    } else {
      setKillResult({
        nodeId:  target,
        success: false,
        msg:     "Killswitch failed. Check backend connection.",
      });
      // Échec : on resynchronise la liste réelle depuis le backend
      const recovered = await getNodes();
      setNodes(recovered);
    }

    setKilling(null);
    // Auto-dismiss du toast après 4s
    setTimeout(() => setKillResult(null), 4000);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <aside style={{
        height: "calc(100vh - 64px)", width: 256,
        position: "fixed", left: 0, top: 64,
        background: "#f1f5f9", borderRight: "1px solid #e2e8f0",
        display: "flex", flexDirection: "column",
        overflowY: "auto", zIndex: 40,
      }}>

        {/* ── Branding ──────────────────────────────────────────────────── */}
        <div style={{ padding: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {/* Section Titre et Sous-titre */}
        <div>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: "#155e75", textTransform: "uppercase", letterSpacing: "0.15em", margin: 0 }}>
            Predictive Dashboard
          </h2>
          <p style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.2em", margin: "4px 0 0" }}>
            Enguer2
          </p>
        </div>

        {/* Redirection GitHub */}
        <a 
          href="https://github.com/Enguer2" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ color: "#155e75", display: "flex", transition: "opacity 0.2s" }}
          title="Voir mon profil GitHub"
          onMouseOver={(e) => e.currentTarget.style.opacity = "0.7"}
          onMouseOut={(e) => e.currentTarget.style.opacity = "1"}
        >
          {/* SVG du logo GitHub */}
          <svg height="24" width="24" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
        </a>
      </div>

        {/* ── Active Nodes (Plug & Play) ─────────────────────────────────── */}
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

          {/* Killswitch result toast */}
          {killResult && (
            <div style={{
              margin: "4px 4px 8px",
              padding: "10px 12px",
              borderRadius: 8,
              background: killResult.success ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
              border: `1px solid ${killResult.success ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
              fontSize: 10,
              fontFamily: "var(--font-label)",
              color: killResult.success ? "#166534" : "#b91c1c",
              lineHeight: 1.4,
            }}>
              <strong>{killResult.nodeId.toUpperCase()}</strong><br />
              {killResult.msg}
            </div>
          )}

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
            nodes.map(node => {
              const alert    = nodeAlerts[node.node_id] ?? "OK";
              const style    = ALERT_STYLE[alert];
              const isActive = node.node_id === activeNode;
              const isBeingKilled = killing === node.node_id;
              const awaitingConfirm = killTarget === node.node_id;

              return (
                <button
                  key={node.node_id}
                  onClick={() => !awaitingConfirm && onSelectNode(node.node_id)}
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
                    background: awaitingConfirm
                      ? "rgba(239,68,68,0.06)"
                      : isActive ? style.bg : "transparent",
                    cursor: "pointer",
                    marginBottom: 3,
                    textAlign: "left",
                    transition: "all 0.2s ease",
                    opacity: isBeingKilled ? 0.4 : 1,
                  }}
                >
                  {/* Status dot */}
                  <span style={{
                    flexShrink: 0,
                    width: 8, height: 8, borderRadius: "50%",
                    background: isBeingKilled ? "#94a3b8" : style.dot,
                    boxShadow: isActive && !isBeingKilled ? `0 0 6px ${style.dot}` : "none",
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
                      {isBeingKilled ? "TERMINATING…" : node.node_id}
                    </p>
                    <p style={{
                      fontSize: 9, color: "#94a3b8", margin: 0,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {node.label}
                    </p>
                  </div>

                  {/* Alert badge */}
                  {alert !== "OK" && !awaitingConfirm && (
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

        {/* ── Static nav ──────────────────────────────────────────────────── */}

        {/* ── Footer buttons ──────────────────────────────────────────────── */}
        <div style={{ padding: 16, borderTop: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: 10 }}>
          {lastRefresh && (
            <p style={{ fontSize: 9, color: "#94a3b8", textAlign: "center", margin: 0, fontFamily: "monospace" }}>
              Sync: {lastRefresh.toLocaleTimeString()}
            </p>
          )}

          {/* ── Deploy Node button ── */}
          <button
            onClick={() => setShowDeploy(true)}
            style={{
              width: "100%", padding: "10px",
              background: "#0e7490", color: "#fff",
              border: "none", borderRadius: 8,
              fontWeight: 700, fontSize: 11, cursor: "pointer",
              textTransform: "uppercase", letterSpacing: "0.1em",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              transition: "background 0.2s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "#155e75")}
            onMouseLeave={e => (e.currentTarget.style.background = "#0e7490")}
          >
            🚀 Deploy Node
          </button>

          {/* ── Emergency Killswitch ── */}
          {killTarget ? (
            /* Confirmation state */
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <p style={{
                fontSize: 9, color: "#ef4444", fontWeight: 700,
                fontFamily: "var(--font-label)", textAlign: "center",
                margin: 0, textTransform: "uppercase", letterSpacing: "0.08em",
              }}>
                Terminate {killTarget.toUpperCase()}?
              </p>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={() => setKillTarget(null)}
                  style={{
                    flex: 1, padding: "8px",
                    background: "#fff", color: "#64748b",
                    border: "1px solid #e2e8f0", borderRadius: 8,
                    fontWeight: 700, fontSize: 10, cursor: "pointer",
                    textTransform: "uppercase",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleKillswitch}
                  style={{
                    flex: 1, padding: "8px",
                    background: "#ef4444", color: "#fff",
                    border: "none", borderRadius: 8,
                    fontWeight: 700, fontSize: 10, cursor: "pointer",
                    textTransform: "uppercase", letterSpacing: "0.05em",
                  }}
                >
                  Confirm
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setKillTarget(activeNode)}
              disabled={!!killing}
              style={{
                width: "100%", padding: "10px",
                background: killing ? "#fef2f2" : "#fef2f2",
                color: killing ? "#fca5a5" : "#ef4444",
                border: "1px solid #fecaca", borderRadius: 8,
                fontWeight: 700, fontSize: 10, cursor: killing ? "not-allowed" : "pointer",
                textTransform: "uppercase", letterSpacing: "0.1em",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                transition: "all 0.2s",
              }}
            >
              {killing ? (
                <>
                  <RefreshCw size={12} style={{ animation: "spin 0.8s linear infinite" }} />
                  Terminating…
                </>
              ) : (
                <>
                  <Zap size={14} />
                  Emergency Killswitch — {activeNode.toUpperCase()}
                </>
              )}
            </button>
          )}
        </div>

        {/* Spin animation */}
        <style>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
      </aside>

      {/* ── Deploy Modal ──────────────────────────────────────────────────── */}
      {showDeploy && (
        <DeployModal
          onClose={() => setShowDeploy(false)}
          onDeployed={nodeId => {
            discover();
          }}
        />
      )}
    </>
  );
}