// ─────────────────────────────────────────────────────────────────────────────
// lib/api.ts  — WATCHMAN_OS API client (v3)
// ─────────────────────────────────────────────────────────────────────────────

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ── Types ─────────────────────────────────────────────────────────────────────

export type AlertLevel = "OK" | "WARNING" | "CRITICAL";

export interface NodeMeta {
  node_id: string;
  label:   string;
  lat:     number;
  lon:     number;
}

export interface NodeStatus extends NodeMeta {
  cpu:           number;
  ram:           number;
  network:       number;
  alert_level:   AlertLevel;
  ai_risk_score: number;
  timestamp:     string | null;
}

export interface StatsPayload {
  node_id:         string;
  cpu:             number;
  ram:             number;
  network:         number;
  cpu_delta:       number;
  ram_delta:       number;
  combined_load:   number;
  is_anomaly:      boolean;
  prediction_code: number;
  ai_risk_score:   number;
  alert_level:     AlertLevel;
  raw_if_score:    number;
  timestamp:       string;
}

export interface HistoryEntry {
  node_id:       string;
  cpu:           number;
  ram:           number;
  network:       number;
  cpu_delta:     number;
  ram_delta:     number;
  combined_load: number;
  is_anomaly:    boolean;
  ai_risk_score: number;
  alert_level:   AlertLevel;
  timestamp:     string | null;
}

// ── Internal helper ───────────────────────────────────────────────────────────

async function get<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (err) {
    console.error(`[api] GET ${path} failed:`, err);
    return null;
  }
}

// ── Exports ───────────────────────────────────────────────────────────────────

/** Vérifie que le backend est accessible. */
export async function checkBackendStatus(): Promise<{ status: "online" | "offline" }> {
  const data = await get<{ status: string }>("/");
  return { status: data?.status === "online" ? "online" : "offline" };
}

/**
 * Découverte Plug & Play — retourne tous les nodes ayant déjà transmis.
 * Appeler toutes les 5 s depuis la Sidebar pour détecter les nouveaux agents.
 */
export async function getNodes(): Promise<NodeMeta[]> {
  return (await get<NodeMeta[]>("/api/nodes")) ?? [];
}

/** Dernier snapshot de chaque node actif (utilisé par NodeMap). */
export async function getAllNodesStatus(): Promise<NodeStatus[]> {
  return (await get<NodeStatus[]>("/api/nodes/status")) ?? [];
}

/**
 * Dernière entrée DB pour ce node.
 * Le frontend poll cette route toutes les 2 s pour rafraîchir l'affichage.
 * Les données sont poussées par les agents via POST /api/report/{node_id}.
 */
export async function getLiveSystemStats(nodeId = "cluster_01"): Promise<StatsPayload | null> {
  return get<StatsPayload>(`/stats/${nodeId}`);
}

/** 50 derniers points d'historique pour un node donné. */
export async function getHistory(nodeId = "cluster_01"): Promise<HistoryEntry[]> {
  return (await get<HistoryEntry[]>(`/history/${nodeId}`)) ?? [];
}

/** @deprecated — conservé pour compatibilité uniquement. */
export async function getAiPrediction(_cpu: number, _ram: number) {
  return null;
}