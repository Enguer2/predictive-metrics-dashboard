"use client";

import { useEffect, useRef } from "react";

export default function Dashboard() {
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll log to bottom on mount
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, []);

  return (
    <>
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

        .material-symbols-outlined {
          font-family: 'Material Symbols Outlined';
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
          display: inline-block;
        }
        .fill-icon {
          font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        :root {
          --primary: #006670;
          --primary-container: #00818d;
          --primary-fixed: #92f1fe;
          --primary-fixed-dim: #75d5e2;
          --on-primary: #ffffff;
          --on-primary-container: #f6feff;
          --secondary: #4c616c;
          --secondary-container: #cfe6f2;
          --on-secondary-container: #526772;
          --tertiary: #006672;
          --tertiary-container: #008190;
          --on-tertiary: #ffffff;
          --on-tertiary-container: #f7feff;
          --error: #ba1a1a;
          --error-container: #ffdad6;
          --on-error: #ffffff;
          --on-error-container: #93000a;
          --background: #f8fafb;
          --on-background: #191c1d;
          --surface: #f8fafb;
          --surface-variant: #e1e3e4;
          --on-surface: #191c1d;
          --on-surface-variant: #3d494b;
          --outline: #6d797b;
          --outline-variant: #bcc9cb;
          --surface-container-lowest: #ffffff;
          --surface-container-low: #f2f4f5;
          --surface-container: #eceeef;
          --surface-container-high: #e6e8e9;
          --surface-container-highest: #e1e3e4;
          --surface-tint: #006972;
          --surface-bright: #f8fafb;
          --surface-dim: #d8dadb;
          --inverse-primary: #75d5e2;
          --inverse-surface: #2e3132;
          --inverse-on-surface: #eff1f2;
          --font-headline: 'Space Grotesk', sans-serif;
          --font-body: 'Inter', sans-serif;
          --font-label: 'Space Grotesk', sans-serif;
        }

        /* Tailwind-like utilities using CSS vars */
        .dash-wrapper {
          background: var(--surface);
          font-family: var(--font-body);
          color: var(--on-surface);
          -webkit-font-smoothing: antialiased;
        }

        /* Ping animation */
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
        .animate-ping { animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite; }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
      `}</style>

      <div className="dash-wrapper min-h-screen">
        {/* Top Navigation Bar */}
        <nav
          style={{
            background: "rgba(248,250,251,0.8)",
            backdropFilter: "blur(12px)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            position: "fixed",
            top: 0,
            width: "100%",
            zIndex: 50,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
            <span
              style={{
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: "-0.05em",
                color: "#155e75",
                fontFamily: "var(--font-label)",
              }}
            >
              Predictive Model
            </span>
            <div style={{ display: "flex", gap: 24 }}>
              {["Dashboard", "Metrics", "Logs"].map((item) => (
                <a
                  key={item}
                  href="#"
                  style={{
                    color:
                      item === "Metrics" ? "var(--primary)" : "#64748b",
                    fontWeight: item === "Metrics" ? 700 : 500,
                    fontFamily: "var(--font-label)",
                    borderBottom:
                      item === "Metrics" ? `2px solid var(--primary)` : "none",
                    padding: "4px 8px",
                    textDecoration: "none",
                    fontSize: 14,
                  }}
                >
                  {item}
                </a>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button
              style={{
                background: "var(--primary)",
                color: "#fff",
                fontFamily: "var(--font-label)",
                padding: "6px 16px",
                borderRadius: 8,
                fontSize: 14,
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              Deploy Node
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {["notifications", "settings"].map((icon) => (
                <span
                  key={icon}
                  className="material-symbols-outlined"
                  style={{
                    color: "var(--on-surface-variant)",
                    padding: 8,
                    borderRadius: "50%",
                    cursor: "pointer",
                    fontSize: 24,
                  }}
                >
                  {icon}
                </span>
              ))}
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "var(--primary-fixed-dim)",
                  border: "1px solid var(--outline-variant)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: "var(--primary)" }}>
                  person
                </span>
              </div>
            </div>
          </div>
        </nav>

        {/* Side Navigation Bar */}
        <aside
          style={{
            height: "100vh",
            width: 256,
            position: "fixed",
            left: 0,
            top: 0,
            paddingTop: 64,
            background: "#f1f5f9",
            display: "flex",
            flexDirection: "column",
            borderRight: "1px solid #e2e8f0",
          }}
        >
          <div style={{ padding: 24 }}>
            <h2
              style={{
                fontWeight: 900,
                color: "#0f172a",
                fontFamily: "var(--font-label)",
                letterSpacing: "-0.04em",
                margin: 0,
              }}
            >
              Aero Watchman
            </h2>
            <p
              style={{
                fontSize: 10,
                color: "var(--on-surface-variant)",
                fontFamily: "var(--font-label)",
                textTransform: "uppercase",
                letterSpacing: "0.15em",
                opacity: 0.7,
                margin: "4px 0 0",
              }}
            >
              High-Altitude Observability
            </p>
          </div>
          <nav style={{ flex: 1 }}>
            {[
              { icon: "dashboard", label: "Command Center", active: false },
              { icon: "hub", label: "Edge Nodes", active: true },
              { icon: "psychology", label: "Neural Analytics", active: false },
              { icon: "security", label: "Threat Logs", active: false },
              { icon: "settings", label: "System Config", active: false },
            ].map(({ icon, label, active }) => (
              <a
                key={label}
                href="#"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 24px",
                  color: active ? "var(--primary)" : "#64748b",
                  fontWeight: active ? 700 : 400,
                  fontFamily: "var(--font-label)",
                  fontSize: 14,
                  textDecoration: "none",
                  background: active ? "#fff" : "transparent",
                  borderRadius: active ? "0 9999px 9999px 0" : 0,
                  transition: "all 0.2s",
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
                  {icon}
                </span>
                {label}
              </a>
            ))}
          </nav>
          <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
            <div
              style={{
                background: "rgba(146,241,254,0.3)",
                padding: 12,
                borderRadius: 8,
              }}
            >
              <p
                style={{
                  fontSize: 10,
                  fontFamily: "var(--font-label)",
                  fontWeight: 700,
                  color: "var(--primary)",
                  marginBottom: 4,
                }}
              >
                System Health: 98%
              </p>
              <div
                style={{
                  width: "100%",
                  background: "#e2e8f0",
                  height: 4,
                  borderRadius: 9999,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    background: "var(--primary)",
                    width: "98%",
                    height: "100%",
                  }}
                />
              </div>
            </div>
            {[
              { icon: "description", label: "Documentation" },
              { icon: "help", label: "Support" },
            ].map(({ icon, label }) => (
              <a
                key={label}
                href="#"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 12,
                  fontFamily: "var(--font-label)",
                  color: "var(--on-surface-variant)",
                  textDecoration: "none",
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                  {icon}
                </span>
                {label}
              </a>
            ))}
          </div>
        </aside>

        {/* Main Content Area */}
        <main style={{ paddingLeft: 256, paddingTop: 64, minHeight: "100vh" }}>
          <div style={{ padding: 32, maxWidth: 1600, margin: "0 auto" }}>
            {/* Header */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "flex-end",
                justifyContent: "space-between",
                gap: 16,
                marginBottom: 32,
              }}
            >
              <div>
                <nav
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 12,
                    fontFamily: "var(--font-label)",
                    color: "var(--on-surface-variant)",
                    marginBottom: 8,
                  }}
                >
                  <span>Edge Nodes</span>
                  <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
                    chevron_right
                  </span>
                  <span style={{ color: "var(--primary)", fontWeight: 700 }}>CLUSTER_01</span>
                </nav>
                <h1
                  style={{
                    fontFamily: "var(--font-headline)",
                    fontSize: 36,
                    fontWeight: 700,
                    letterSpacing: "-0.04em",
                    color: "var(--on-surface)",
                    margin: 0,
                  }}
                >
                  NODE: CLUSTER_01
                </h1>
                <p
                  style={{
                    fontFamily: "var(--font-label)",
                    fontSize: 14,
                    color: "var(--on-surface-variant)",
                    marginTop: 4,
                    opacity: 0.8,
                  }}
                >
                  Satellite Relay / Northern Sector Deployment
                </p>
              </div>
              <div
                style={{
                  background: "var(--surface-container-high)",
                  padding: "8px 16px",
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div
                  className="animate-pulse"
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#22c55e",
                  }}
                />
                <span
                  style={{
                    fontFamily: "var(--font-label)",
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                  }}
                >
                  Live Predictive Link Active
                </span>
              </div>
            </div>

            {/* Bento Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(12, 1fr)",
                gap: 24,
              }}
            >
              {/* Left Column — Neural Prediction + Logs */}
              <section
                style={{
                  gridColumn: "span 8",
                  display: "flex",
                  flexDirection: "column",
                  gap: 24,
                }}
              >
                {/* Neural Incident Prediction */}
                <div
                  style={{
                    background: "var(--surface-container-low)",
                    borderRadius: 12,
                    padding: 24,
                    display: "flex",
                    flexDirection: "column",
                    gap: 24,
                  }}
                >
                  <header
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderBottom: "1px solid rgba(188,201,203,0.2)",
                      paddingBottom: 16,
                    }}
                  >
                    <h2
                      style={{
                        fontFamily: "var(--font-headline)",
                        fontSize: 20,
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        margin: 0,
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ color: "var(--primary)" }}>
                        psychology
                      </span>
                      Neural Incident Prediction
                    </h2>
                    <span
                      style={{
                        fontSize: 10,
                        fontFamily: "var(--font-label)",
                        fontWeight: 700,
                        color: "var(--on-surface-variant)",
                        padding: "4px 8px",
                        background: "var(--surface-container-highest)",
                        borderRadius: 9999,
                      }}
                    >
                      REF: ENGINE_AI_v4.2
                    </span>
                  </header>

                  {/* Risk Cards */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                    {[
                      {
                        label: "Memory Leak",
                        value: 12,
                        color: "var(--primary)",
                        note: "Nominal variance detected in slab allocation.",
                        bold: false,
                      },
                      {
                        label: "Latency Degradation",
                        value: 42,
                        color: "#eab308",
                        note: "Probability spike in packet re-transmission at 04:00Z.",
                        bold: false,
                      },
                      {
                        label: "Thermal Variance",
                        value: 89,
                        color: "var(--error)",
                        note: "Critical: Predicted thermal throttling in T-minus 12min.",
                        bold: true,
                      },
                    ].map(({ label, value, color, note, bold }) => (
                      <div
                        key={label}
                        style={{
                          background: "var(--surface-container-lowest)",
                          padding: 20,
                          borderRadius: 8,
                          borderBottom: `2px solid ${color}`,
                          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                          transition: "box-shadow 0.2s",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            marginBottom: 16,
                          }}
                        >
                          <span
                            style={{
                              fontFamily: "var(--font-label)",
                              fontSize: 12,
                              fontWeight: 700,
                              color: "var(--on-surface-variant)",
                            }}
                          >
                            {label}
                          </span>
                          <span
                            style={{
                              color,
                              fontWeight: 700,
                              fontFamily: "var(--font-headline)",
                              fontSize: 18,
                            }}
                          >
                            {value}%
                          </span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          <div
                            style={{
                              height: 4,
                              width: "100%",
                              background: "var(--surface-container-high)",
                              borderRadius: 9999,
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                background: color,
                                width: `${value}%`,
                                height: "100%",
                                transition: "width 0.8s ease",
                              }}
                            />
                          </div>
                          <p
                            style={{
                              fontSize: 10,
                              fontFamily: "var(--font-label)",
                              color: bold ? color : "var(--on-surface-variant)",
                              opacity: bold ? 1 : 0.7,
                              fontStyle: "italic",
                              fontWeight: bold ? 700 : 400,
                              margin: 0,
                            }}
                          >
                            {note}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Chart */}
                  <div
                    style={{
                      height: 192,
                      background: "var(--surface-container-highest)",
                      borderRadius: 8,
                      position: "relative",
                      overflow: "hidden",
                      display: "flex",
                      alignItems: "flex-end",
                      padding: "0 16px",
                      gap: 4,
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        padding: 16,
                        display: "flex",
                        justifyContent: "space-between",
                        pointerEvents: "none",
                      }}
                    >
                      <span style={{ fontSize: 9, fontFamily: "var(--font-label)", color: "rgba(61,73,75,0.4)" }}>
                        ANALYTICS TREND (24H)
                      </span>
                      <span style={{ fontSize: 9, fontFamily: "var(--font-label)", color: "rgba(61,73,75,0.4)" }}>
                        98.4% ACCURACY
                      </span>
                    </div>
                    {[
                      { h: 30, color: "rgba(0,102,112,0.2)" },
                      { h: 45, color: "rgba(0,102,112,0.3)" },
                      { h: 40, color: "rgba(0,102,112,0.25)" },
                      { h: 60, color: "rgba(0,102,112,0.4)" },
                      { h: 85, color: "rgba(0,102,112,0.6)" },
                      { h: 70, color: "rgba(234,179,8,0.4)" },
                      { h: 95, color: "rgba(186,26,26,0.5)" },
                      { h: 100, color: "rgba(186,26,26,0.7)" },
                      { h: 80, color: "rgba(186,26,26,0.4)" },
                      { h: 40, color: "rgba(0,102,112,0.2)" },
                    ].map((bar, i) => (
                      <div
                        key={i}
                        style={{
                          flex: 1,
                          background: bar.color,
                          height: `${bar.h}%`,
                          borderRadius: "4px 4px 0 0",
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Live Kernel Log Stream */}
                <div
                  style={{
                    background: "#0f172a",
                    borderRadius: 12,
                    padding: 24,
                    boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
                    borderLeft: "4px solid #06b6d4",
                  }}
                >
                  <header
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 16,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span className="material-symbols-outlined" style={{ color: "#67e8f9", fontSize: 16 }}>
                        terminal
                      </span>
                      <h2
                        style={{
                          fontFamily: "var(--font-headline)",
                          color: "#f1f5f9",
                          fontSize: 14,
                          fontWeight: 700,
                          letterSpacing: "0.15em",
                          textTransform: "uppercase",
                          margin: 0,
                        }}
                      >
                        Live Kernel Log Stream
                      </h2>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#06b6d4" }} />
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#334155" }} />
                    </div>
                  </header>
                  <div
                    ref={logRef}
                    className="no-scrollbar"
                    style={{
                      fontFamily: "monospace",
                      fontSize: 12,
                      lineHeight: "1.6",
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                      height: 256,
                      overflowY: "auto",
                    }}
                  >
                    {[
                      {
                        ts: "09:22:01",
                        level: "INFO",
                        levelColor: "#34d399",
                        msg: "sys_kernel: Node CLUSTER_01 heartbeat acknowledged.",
                        color: "#94a3b8",
                      },
                      {
                        ts: "09:22:04",
                        level: "INFO",
                        levelColor: "#34d399",
                        msg: "neural_engine: Recalibrating predictive weights based on thermal spike.",
                        color: "#94a3b8",
                      },
                      {
                        ts: "09:22:12",
                        level: "DEBUG",
                        levelColor: "#60a5fa",
                        msg: "net_stack: TCP retransmission detected on eth0 (0.1ms delay).",
                        color: "#94a3b8",
                      },
                      {
                        ts: "09:23:45",
                        level: "WARN",
                        levelColor: "#fbbf24",
                        msg: "thermal_ctrl: Package temperature exceeds threshold (78C).",
                        color: "#f1f5f9",
                      },
                      {
                        ts: "09:24:01",
                        level: "INFO",
                        levelColor: "#34d399",
                        msg: "sys_kernel: Flushing buffer cache to reduce IO wait.",
                        color: "#94a3b8",
                      },
                      {
                        ts: "09:24:18",
                        level: "CRIT",
                        levelColor: "var(--error)",
                        msg: "neural_engine: 89% probability of thermal throttling event confirmed.",
                        color: "var(--error)",
                        bold: true,
                      },
                      {
                        ts: "09:24:30",
                        level: "INFO",
                        levelColor: "#34d399",
                        msg: "fan_ctrl: Dynamic RPM scaling initiated (4500 -> 6200).",
                        color: "#94a3b8",
                      },
                    ].map((log, i) => (
                      <p key={i} style={{ margin: 0, color: log.color, fontWeight: log.bold ? 700 : 400 }}>
                        <span style={{ color: "#67e8f9" }}>[{log.ts}]</span>{" "}
                        <span style={{ color: log.levelColor }}>{log.level}</span> {log.msg}
                      </p>
                    ))}
                    <p style={{ margin: 0, color: "#475569", fontStyle: "italic", opacity: 0.5 }}>
                      -- Stream awaiting packet ingestion --
                    </p>
                  </div>
                </div>
              </section>

              {/* Right Column — Map + Telemetry */}
              <section
                style={{
                  gridColumn: "span 4",
                  display: "flex",
                  flexDirection: "column",
                  gap: 24,
                }}
              >
                {/* Map Widget */}
                <div
                  style={{
                    background: "var(--surface-container-low)",
                    borderRadius: 12,
                    overflow: "hidden",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                    display: "flex",
                    flexDirection: "column",
                    height: 400,
                  }}
                >
                  <div
                    style={{
                      padding: "12px 16px",
                      background: "var(--surface-container-high)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <h3
                      style={{
                        fontFamily: "var(--font-label)",
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.12em",
                        color: "var(--on-surface-variant)",
                        margin: 0,
                      }}
                    >
                      Global Mesh Node Location
                    </h3>
                    <span className="material-symbols-outlined" style={{ color: "var(--primary)", fontSize: 16 }}>
                      location_on
                    </span>
                  </div>
                  <div
                    style={{
                      flex: 1,
                      position: "relative",
                      background: "#cbd5e1",
                      overflow: "hidden",
                    }}
                  >
                    {/* Map placeholder with gradient */}
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background:
                          "linear-gradient(135deg, #0f4c81 0%, #1e6091 30%, #134874 60%, #0c3547 100%)",
                        opacity: 0.85,
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        backgroundImage:
                          "radial-gradient(circle at 30% 50%, rgba(6,182,212,0.15) 0%, transparent 60%), radial-gradient(circle at 70% 30%, rgba(0,102,112,0.2) 0%, transparent 50%)",
                      }}
                    />

                    {/* Pulse marker */}
                    <div
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                      }}
                    >
                      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <div
                          className="animate-ping"
                          style={{
                            position: "absolute",
                            width: 48,
                            height: 48,
                            borderRadius: "50%",
                            background: "rgba(0,102,112,0.2)",
                          }}
                        />
                        <div
                          style={{
                            width: 16,
                            height: 16,
                            background: "var(--primary)",
                            border: "2px solid #fff",
                            borderRadius: "50%",
                            position: "relative",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
                          }}
                        />
                      </div>
                    </div>

                    {/* Coord label */}
                    <div
                      style={{
                        position: "absolute",
                        bottom: 16,
                        left: 16,
                        background: "rgba(248,250,251,0.9)",
                        backdropFilter: "blur(8px)",
                        padding: 12,
                        borderRadius: 8,
                        border: "1px solid rgba(188,201,203,0.3)",
                        maxWidth: 200,
                      }}
                    >
                      <p
                        style={{
                          fontSize: 10,
                          fontFamily: "var(--font-label)",
                          fontWeight: 700,
                          color: "var(--on-surface)",
                          textTransform: "uppercase",
                          margin: "0 0 2px",
                        }}
                      >
                        Active Node Coord
                      </p>
                      <p style={{ fontSize: 12, fontFamily: "monospace", color: "var(--primary)", margin: 0 }}>
                        64.1265° N, 21.8174° W
                      </p>
                    </div>
                  </div>
                </div>

                {/* Telemetry */}
                <div
                  style={{
                    background: "var(--surface-container-low)",
                    borderRadius: 12,
                    padding: 24,
                    display: "flex",
                    flexDirection: "column",
                    gap: 16,
                  }}
                >
                  <h3
                    style={{
                      fontFamily: "var(--font-label)",
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.12em",
                      color: "var(--on-surface-variant)",
                      margin: 0,
                    }}
                  >
                    Live Telemetry
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {[
                      {
                        icon: "speed",
                        label: "Throughput",
                        value: "1.2 Gbps",
                        trend: "trending_up",
                        trendColor: "#22c55e",
                      },
                      {
                        icon: "database",
                        label: "Storage IO",
                        value: "45.8 MB/s",
                        trend: "horizontal_rule",
                        trendColor: "var(--on-surface-variant)",
                      },
                      {
                        icon: "memory",
                        label: "CPU Load",
                        value: "92.4%",
                        trend: "trending_up",
                        trendColor: "var(--error)",
                      },
                    ].map(({ icon, label, value, trend, trendColor }) => (
                      <div
                        key={label}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: 12,
                          background: "var(--surface-container-lowest)",
                          borderRadius: 8,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <span
                            className="material-symbols-outlined"
                            style={{ color: "var(--primary)", fontSize: 22 }}
                          >
                            {icon}
                          </span>
                          <div>
                            <p
                              style={{
                                fontSize: 10,
                                fontFamily: "var(--font-label)",
                                color: "var(--on-surface-variant)",
                                lineHeight: 1,
                                margin: "0 0 4px",
                              }}
                            >
                              {label}
                            </p>
                            <p
                              style={{
                                fontWeight: 700,
                                fontFamily: "var(--font-headline)",
                                color: "var(--on-surface)",
                                margin: 0,
                              }}
                            >
                              {value}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`material-symbols-outlined fill-icon`}
                          style={{ color: trendColor, fontSize: 16 }}
                        >
                          {trend}
                        </span>
                      </div>
                    ))}
                  </div>
                  <button
                    style={{
                      width: "100%",
                      padding: "8px 0",
                      background: "var(--secondary-container)",
                      color: "var(--on-secondary-container)",
                      fontFamily: "var(--font-label)",
                      fontSize: 12,
                      fontWeight: 700,
                      borderRadius: 8,
                      border: "none",
                      cursor: "pointer",
                      transition: "opacity 0.2s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                  >
                    DOWNLOAD RAW METRICS
                  </button>
                </div>
              </section>
            </div>
          </div>
        </main>

        {/* Mobile Bottom Nav */}
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            width: "100%",
            background: "#fff",
            boxShadow: "0 -4px 10px rgba(0,0,0,0.05)",
            display: "flex",
            justifyContent: "space-around",
            padding: 12,
            zIndex: 50,
          }}
          className="md:hidden"
        >
          {[
            { icon: "hub", label: "Nodes", active: true },
            { icon: "psychology", label: "Neural", active: false },
            { icon: "security", label: "Alerts", active: false },
            { icon: "settings", label: "Config", active: false },
          ].map(({ icon, label, active }) => (
            <a
              key={label}
              href="#"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                color: active ? "var(--primary)" : "#94a3b8",
                textDecoration: "none",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 24 }}>
                {icon}
              </span>
              <span style={{ fontSize: 10, fontFamily: "var(--font-label)", fontWeight: active ? 700 : 400 }}>
                {label}
              </span>
            </a>
          ))}
        </div>
      </div>
    </>
  );
}