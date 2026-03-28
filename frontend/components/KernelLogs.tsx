"use client";

import { useEffect, useRef } from "react";

export default function KernelLogs() {
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, []);

  const logs = [
    { ts: "09:22:01", level: "INFO", levelColor: "#34d399", msg: "sys_kernel: Node CLUSTER_01 heartbeat acknowledged.", color: "#94a3b8" },
    { ts: "09:22:04", level: "INFO", levelColor: "#34d399", msg: "neural_engine: Recalibrating predictive weights based on thermal spike.", color: "#94a3b8" },
    { ts: "09:22:12", level: "DEBUG", levelColor: "#60a5fa", msg: "net_stack: TCP retransmission detected on eth0 (0.1ms delay).", color: "#94a3b8" },
    { ts: "09:23:45", level: "WARN", levelColor: "#fbbf24", msg: "thermal_ctrl: Package temperature exceeds threshold (78C).", color: "#f1f5f9" },
    { ts: "09:24:01", level: "INFO", levelColor: "#34d399", msg: "sys_kernel: Flushing buffer cache to reduce IO wait.", color: "#94a3b8" },
    { ts: "09:24:18", level: "CRIT", levelColor: "var(--error)", msg: "neural_engine: 89% probability of thermal throttling event confirmed.", color: "var(--error)", bold: true },
    { ts: "09:24:30", level: "INFO", levelColor: "#34d399", msg: "fan_ctrl: Dynamic RPM scaling initiated (4500 -> 6200).", color: "#94a3b8" },
  ];

  return (
    <div style={{ background: "#0f172a", borderRadius: 12, padding: 24, boxShadow: "0 20px 40px rgba(0,0,0,0.3)", borderLeft: "4px solid #06b6d4" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="material-symbols-outlined" style={{ color: "#67e8f9", fontSize: 16 }}>terminal</span>
          <h2 style={{ fontFamily: "var(--font-headline)", color: "#f1f5f9", fontSize: 14, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", margin: 0 }}>
            Live Kernel Log Stream
          </h2>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#06b6d4" }} />
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#334155" }} />
        </div>
      </header>
      <div ref={logRef} className="no-scrollbar" style={{ fontFamily: "monospace", fontSize: 12, lineHeight: "1.6", display: "flex", flexDirection: "column", gap: 4, height: 256, overflowY: "auto" }}>
        {logs.map((log, i) => (
          <p key={i} style={{ margin: 0, color: log.color, fontWeight: log.bold ? 700 : 400 }}>
            <span style={{ color: "#67e8f9" }}>[{log.ts}]</span> <span style={{ color: log.levelColor }}>{log.level}</span> {log.msg}
          </p>
        ))}
        <p style={{ margin: 0, color: "#475569", fontStyle: "italic", opacity: 0.5 }}>-- Stream awaiting packet ingestion --</p>
      </div>
    </div>
  );
}