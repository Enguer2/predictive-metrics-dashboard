"use client";

import { useState, useCallback } from "react";
import Sidebar   from "@/components/Sidebar";
import Dashboard from "@/components/Dashboard";
import { type AlertLevel } from "@/lib/api";

/**
 * Page racine — gère l'état global :
 *   - activeNode   : node sélectionné dans la Sidebar
 *   - nodeAlerts   : map node_id → AlertLevel, mise à jour par le Dashboard
 *
 * La Sidebar reçoit nodeAlerts pour colorer les boutons.
 * Le Dashboard reçoit activeNode et remonte les alertes via onAlertChange.
 */
export default function Home() {
  const [activeNode, setActiveNode] = useState<string>("cluster_01");
  const [nodeAlerts, setNodeAlerts] = useState<Record<string, AlertLevel>>({});

  const handleAlertChange = useCallback((nodeId: string, alert: AlertLevel) => {
    setNodeAlerts(prev => {
      if (prev[nodeId] === alert) return prev; // évite les re-renders inutiles
      return { ...prev, [nodeId]: alert };
    });
  }, []);

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar
        activeNode={activeNode}
        onSelectNode={setActiveNode}
        nodeAlerts={nodeAlerts}
      />

      <main style={{
        marginLeft: 256,
        flex: 1,
        padding: 32,
        paddingTop: 96, // 64px header + 32px gap
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