"use client";

import { useState, useCallback, useEffect } from "react";
import Sidebar   from "@/components/Sidebar";
import Dashboard from "@/components/Dashboard";
import { type AlertLevel } from "@/lib/api";
import { Terminal, Shield, Activity } from "lucide-react";

export default function Home() {
  // ── States pour la session ──
  const [isSessionActive, setIsSessionActive] = useState<boolean | null>(null); // null = chargement initial

  // ── States existants du Dashboard ──
  const [activeNode, setActiveNode] = useState<string>("cluster_01");
  const [nodeAlerts, setNodeAlerts] = useState<Record<string, AlertLevel>>({});

  // ── 1. Vérification & Inactivité de la Session ──
  useEffect(() => {
    // Vérifie si l'utilisateur a déjà une session active au montage
    const currentSession = sessionStorage.getItem("watchman_session_id");
    if (currentSession) {
      setIsSessionActive(true);
    } else {
      setIsSessionActive(false);
    }

    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      // Ne déclenche le timer que si la session est active
      if (!sessionStorage.getItem("watchman_session_id")) return;

      clearTimeout(timeoutId);
      // 15 minutes = 900 000 ms
      timeoutId = setTimeout(() => {
        sessionStorage.removeItem("watchman_session_id");
        setIsSessionActive(false);
        alert("Session expirée pour inactivité. L'environnement a été purgé.");
        window.location.reload();
      }, 15 * 60 * 1000);
    };

    const events = ["mousemove", "keydown", "mousedown", "scroll"];
    events.forEach(event => window.addEventListener(event, resetTimer));

    resetTimer();

    return () => {
      events.forEach(event => window.removeEventListener(event, resetTimer));
      clearTimeout(timeoutId);
    };
  }, [isSessionActive]);

  // ── Fonction pour lancer une nouvelle session ──
  const handleStartSession = () => {
    try {
      // Plan A : HTTPS / Localhost
      let newSessionId;
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        newSessionId = crypto.randomUUID();
      } else {
        // Plan B : HTTP simple (Générateur aléatoire manuel)
        newSessionId = 'session_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      }
      
      sessionStorage.setItem("watchman_session_id", newSessionId);
      setIsSessionActive(true);
    } catch (error) {
      console.error("Erreur lors de la création de la session:", error);
      alert("Erreur d'initialisation. Vérifiez la console.");
    }
  };

  // ── Callbacks du Dashboard ──
  const handleAlertChange = useCallback((nodeId: string, alert: AlertLevel) => {
    setNodeAlerts(prev => {
      if (prev[nodeId] === alert) return prev;
      return { ...prev, [nodeId]: alert };
    });
  }, []);

  const handleNodeKilled = useCallback((killedNodeId: string) => {
    setNodeAlerts(prev => {
      const next = { ...prev };
      delete next[killedNodeId];
      return next;
    });

    if (killedNodeId === activeNode) {
      setActiveNode("cluster_01");
    }
  }, [activeNode]);

  // ── RENDU : Écran de chargement court pour éviter le scintillement ──
  if (isSessionActive === null) {
    return <div style={{ minHeight: "100vh", backgroundColor: "var(--background)" }} />;
  }

  // ── RENDU : Landing Page (Si pas de session) ──
  if (!isSessionActive) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--background)",
        color: "var(--on-surface)",
        padding: 24,
        fontFamily: "var(--font-label)"
      }}>
        <div style={{
          maxWidth: 600,
          width: "100%",
          padding: 40,
          borderRadius: 16,
          backgroundColor: "var(--surface)",
          border: "1px solid var(--surface-border)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          textAlign: "center"
        }}>
          <Shield size={48} color="#22c55e" style={{ margin: "0 auto 24px" }} />
          
          <h1 style={{ fontSize: 32, fontWeight: 700, fontFamily: "var(--font-headline)", marginBottom: 16 }}>
            WATCHMAN_OS
          </h1>
          
          <p style={{ color: "var(--on-surface-variant)", lineHeight: 1.6, marginBottom: 32 }}>
            Welcome to the AI Predictive Monitoring sandbox. 
            To ensure data integrity and avoid resource collisions, each visitor is assigned an isolated, ephemeral instance.
          </p>

          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            marginBottom: 32,
            textAlign: "left",
            backgroundColor: "var(--background)",
            padding: 24,
            borderRadius: 8,
            border: "1px solid var(--surface-border)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Terminal size={18} color="#3b82f6" />
              <span style={{ fontSize: 14 }}>Private session established instantly</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Activity size={18} color="#f59e0b" />
              <span style={{ fontSize: 14 }}>Real-time agent simulation enabled</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Shield size={18} color="#ef4444" />
              <span style={{ fontSize: 14 }}>Auto-destruct sequence after 15m of inactivity</span>
            </div>
          </div>

          <button 
            onClick={handleStartSession}
            style={{
              width: "100%",
              padding: "16px 24px",
              backgroundColor: "#22c55e",
              color: "#000",
              border: "none",
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "var(--font-headline)",
              transition: "transform 0.2s, opacity 0.2s",
            }}
            onMouseOver={(e) => e.currentTarget.style.opacity = "0.9"}
            onMouseOut={(e) => e.currentTarget.style.opacity = "1"}
            onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.98)"}
            onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
          >
            INITIALIZE SANDBOX SESSION
          </button>
        </div>
      </div>
    );
  }

  // ── RENDU : Dashboard Principal (Si session active) ──
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar
        activeNode={activeNode}
        onSelectNode={setActiveNode}
        nodeAlerts={nodeAlerts}
        onNodeKilled={handleNodeKilled}
      />

      <main style={{
        marginLeft: 256,
        flex: 1,
        padding: 32,
        paddingTop: 96,
        maxWidth: 1600,
      }}>
        <Dashboard
          activeNode={activeNode}
          onAlertChange={handleAlertChange}
          onSelectNode={setActiveNode}
        />
      </main>
    </div>
  );
}