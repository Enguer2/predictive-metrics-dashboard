"use client";

import { useEffect, useRef, useState } from "react";

interface LogEntry {
  ts: string;
  level: string;
  levelColor: string;
  msg: string;
  color: string;
  bold?: boolean;
}

interface KernelLogsProps {
  prediction: any;
}

export default function KernelLogs({ prediction }: KernelLogsProps) {
  const logRef = useRef<HTMLDivElement>(null);
  
  const [logs, setLogs] = useState<LogEntry[]>([
    { ts: "09:22:01", level: "INFO", levelColor: "#34d399", msg: "sys_kernel: Node CLUSTER_01 heartbeat acknowledged.", color: "#94a3b8", bold: false },
    { ts: "09:22:04", level: "INFO", levelColor: "#34d399", msg: "neural_engine: Initializing Isolation Forest weights...", color: "#94a3b8", bold: false },
  ]);

  useEffect(() => {
    if (prediction) {
      const inferenceLabel = prediction.is_anomaly ? "Anomaly" : "Normal";
      
      const newLog: LogEntry = {
        ts: prediction.timestamp || new Date().toLocaleTimeString(),
        level: prediction.is_anomaly ? "CRIT" : "IA_OPS",
        levelColor: prediction.is_anomaly ? "#ef4444" : "#60a5fa",
        msg: prediction.is_anomaly 
          ? ` ANOMALY DETECTED: Pattern mismatch at CPU ${prediction.cpu}% / RAM ${prediction.ram}%`
          : ` Pattern analysis: System state nominal (Inference: ${inferenceLabel})`, 
        color: "#94a3b8",
        bold: prediction.is_anomaly
      };

      setLogs(prev => [...prev.slice(-10), newLog]);
    }
  }, [prediction]);
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div style={{ background: "#0a0e14", borderRadius: 12, padding: 24, border: "1px solid #1e293b", boxShadow: "0 0 20px rgba(6, 182, 212, 0.1)" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="material-symbols-outlined" style={{ color: "#06b6d4", fontSize: 16 }}>terminal</span>
          <h2 style={{ fontFamily: "var(--font-headline)", color: "#f1f5f9", fontSize: 12, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", margin: 0 }}>
            Live AI Inference Stream
          </h2>
        </div>
      </header>
      
      <div ref={logRef} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, lineHeight: "1.6", display: "flex", flexDirection: "column", gap: 4, height: 200, overflowY: "auto", color: "#94a3b8" }}>
        {logs.map((log, i) => (
          <p key={i} style={{ margin: 0, color: log.color, fontWeight: log.bold ? 700 : 400 }}>
            <span style={{ color: "#475569", marginRight: 8 }}>[{log.ts}]</span>
            <span style={{ color: log.levelColor, marginRight: 8, fontWeight: 800 }}>{log.level}</span>
            {log.msg}
          </p>
        ))}
      </div>
    </div>
  );
}