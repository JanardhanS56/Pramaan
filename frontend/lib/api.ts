/**
 * API client for Setu Pramaan backend.
 */

export interface DriverItem {
  label: string;
  direction: "positive" | "negative" | "neutral";
  magnitude_hint?: string;
}

export interface IntervalT {
  lower: number;
  upper: number;
}

export interface SuggestionCard {
  id: string;
  suggestion_id: string;
  contract_id: string;
  fpo_id: string;
  buyer_name?: string;
  buyer_requires_t: number;
  crop: string;
  grade?: string;
  due_date?: string;
  contract_quantity_t: number;
  confidence: number;
  lower_t: number;
  upper_t: number;
  interval_t: IntervalT;
  point_t: number;
  point_estimate_t: number;
  shortfall_risk: number;
  status: "GREEN" | "AMBER" | "RED";
  recommended_t: number;
  recommended_commitment_t: number;
  message: string;
  low_information: boolean;
  drivers: DriverItem[];
  model_version: string;
  calibration_version: string;
  calibration_size: number;
  calib_size: number;
  backtest_coverage?: number;
  input_hash: string;
  created_at: string;
}

export interface BacktestLevel {
  nominal: number;
  empirical_coverage: number;
  passed: boolean;
  mean_width: number;
  winkler_score: number;
}

export interface BacktestReport {
  crop: string;
  held_out_season: string;
  calib_size: number;
  test_size: number;
  gate_status: "OPEN" | "CLOSED";
  nominal_80: BacktestLevel;
  nominal_90: BacktestLevel;
  stratum_coverage: Record<string, number>;
  stratum_passed: boolean;
}

export interface AuditEvent {
  id: number;
  entity: string;
  entity_id: string;
  event: string;
  payload: Record<string, any>;
  created_at: string;
}

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:8000"
    : "http://127.0.0.1:8000");

export async function fetchHealth(): Promise<{ status: string; version: string }> {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}

export async function fetchSuggestions(status?: string): Promise<SuggestionCard[]> {
  const url = status ? `${API_BASE}/suggestions?status=${status}` : `${API_BASE}/suggestions`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch suggestions");
  return res.json();
}

export async function fetchSuggestionById(id: string): Promise<SuggestionCard> {
  const res = await fetch(`${API_BASE}/suggestions/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch suggestion ${id}`);
  return res.json();
}

export async function generateSuggestions(confidence: number = 0.80): Promise<SuggestionCard[]> {
  const res = await fetch(`${API_BASE}/suggestions/generate?confidence=${confidence}`, {
    method: "POST",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.detail?.error?.message || "Failed to generate suggestions");
  }
  return res.json();
}

export async function recordDecision(
  suggestionId: string,
  data: {
    action: "accept" | "override" | "verify";
    committed_t: number;
    reason?: string;
    actor: string;
  }
) {
  const res = await fetch(`${API_BASE}/suggestions/${suggestionId}/decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.detail?.error?.message || "Failed to record decision");
  }
  return res.json();
}

export async function fetchBacktestReport(crop: string): Promise<BacktestReport> {
  const res = await fetch(`${API_BASE}/backtest/${crop}`);
  if (!res.ok) throw new Error(`Failed to fetch backtest for ${crop}`);
  return res.json();
}

export async function fetchAuditLogs(entity?: string): Promise<AuditEvent[]> {
  const url = entity ? `${API_BASE}/audit?entity=${entity}` : `${API_BASE}/audit`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch audit logs");
  return res.json();
}
