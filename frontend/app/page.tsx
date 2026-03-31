"use client";

import { useState, useCallback } from "react";
import Sidebar   from "@/components/Sidebar";
import Dashboard from "@/components/Dashboard";
import { type AlertLevel } from "@/lib/api";


export default function Home() {
  const [activeNode, setActiveNode] = useState<string>("cluster_01");
  const [nodeAlerts, setNodeAlerts] = useState<Record<string, AlertLevel>>({});

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