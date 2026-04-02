// ─────────────────────────────────────────────────────────────────────────────
// lib/api.ts  — WATCHMAN_OS API client (v3.1)
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

export interface ScenarioEntry {
  filename:     string;
  path:         string;
  size_kb:      number;
  row_count:    number;
  columns:      string[];
  has_required: boolean;
}

export interface KillswitchResult {
  status:       string;
  node_id:      string;
  deleted_rows: number;
  actions:      string[];
  message:      string;
  timestamp:    string;
}

// ── Internal helper ───────────────────────────────────────────────────────────

export function getSessionId(): string {
  if (typeof window === "undefined") return "anonymous";
  return sessionStorage.getItem("watchman_session_id") ?? "anonymous";
}

// Mise à jour du helper interne "get"
async function get<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, { 
      cache: "no-store",
      headers: {
        "X-Session-ID": getSessionId()
      }
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (err) {
    console.error(`[api] GET ${path} failed:`, err);
    return null;
  }
}

// ── Exports ───────────────────────────────────────────────────────────────────

export async function checkBackendStatus(): Promise<{ status: "online" | "offline" }> {
  const data = await get<{ status: string }>("/");
  return { status: data?.status === "online" ? "online" : "offline" };
}

export async function getNodes(): Promise<NodeMeta[]> {
  return (await get<NodeMeta[]>("/api/nodes")) ?? [];
}

export async function getAllNodesStatus(): Promise<NodeStatus[]> {
  return (await get<NodeStatus[]>("/api/nodes/status")) ?? [];
}

export async function getLiveSystemStats(nodeId = "cluster_01"): Promise<StatsPayload | null> {
  return get<StatsPayload>(`/stats/${nodeId}`);
}

export async function getHistory(nodeId = "cluster_01"): Promise<HistoryEntry[]> {
  return (await get<HistoryEntry[]>(`/history/${nodeId}`)) ?? [];
}


export async function getScenarios(): Promise<ScenarioEntry[]> {
  return (await get<ScenarioEntry[]>("/api/scenarios")) ?? [];
}

export async function killNode(nodeId: string): Promise<KillswitchResult | null> {
  try {
    const res = await fetch(`${API_URL}/api/nodes/${encodeURIComponent(nodeId)}`, {
      method: "DELETE",
      cache:  "no-store",
      headers: {
        "X-Session-ID": getSessionId()
      }
    });
    if (!res.ok) return null;
    return (await res.json()) as KillswitchResult;
  } catch (err) {
    console.error(`[api] DELETE /api/nodes/${nodeId} failed:`, err);
    return null;
  }
}

export async function getAiPrediction(_cpu: number, _ram: number) {
  return null;
}