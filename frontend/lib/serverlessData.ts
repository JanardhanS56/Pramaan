/**
 * Canonical Sahyadri FPO benchmark data & serverless state handler for Vercel deployment.
 * Ensures the app functions 100% out-of-the-box on Vercel even if a standalone FastAPI instance isn't connected.
 */

export interface DriverItem {
  label: string;
  direction: "positive" | "negative" | "neutral";
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
  interval_t: { lower: number; upper: number };
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

export interface BacktestReport {
  crop: string;
  held_out_season: string;
  calib_size: number;
  test_size: number;
  gate_status: "OPEN" | "CLOSED";
  nominal_80: {
    nominal: number;
    empirical_coverage: number;
    passed: boolean;
    mean_width: number;
    winkler_score: number;
  };
  nominal_90: {
    nominal: number;
    empirical_coverage: number;
    passed: boolean;
    mean_width: number;
    winkler_score: number;
  };
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

// In-memory state for serverless execution
export let initialSuggestions: SuggestionCard[] = [
  {
    id: "SUG-2025-07",
    suggestion_id: "SUG-2025-07",
    contract_id: "CTR-2025-07",
    fpo_id: "FPO-SAHYADRI",
    buyer_name: "Reliance Retail",
    buyer_requires_t: 100.0,
    crop: "onion",
    grade: "Grade A",
    due_date: "2025-04-15",
    contract_quantity_t: 100.0,
    confidence: 0.80,
    lower_t: 72.4,
    upper_t: 88.1,
    interval_t: { lower: 72.4, upper: 88.1 },
    point_t: 80.2,
    point_estimate_t: 80.2,
    shortfall_risk: 0.91,
    status: "AMBER",
    recommended_t: 72.4,
    recommended_commitment_t: 72.4,
    message: "Commit 72.4 t now. Committing 100 t carries a 91% shortfall risk.",
    low_information: false,
    drivers: [
      { label: "Sentinel-2 NDVI Vegetative Stress: 3 of 12 member plots trail seasonal mean by >15%", direction: "negative" },
      { label: "Historical Member Reliability: 2 member farmers recorded side-selling behavior last season", direction: "negative" },
      { label: "Grade-A Specification Tightness: Buyer tolerance requires strict >55mm diameter curing", direction: "neutral" },
    ],
    model_version: "v1.0-gbdt",
    calibration_version: "v1.0-split-conformal",
    calibration_size: 150,
    calib_size: 150,
    backtest_coverage: 0.85,
    input_hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    created_at: new Date().toISOString(),
  },
  {
    id: "SUG-2025-08",
    suggestion_id: "SUG-2025-08",
    contract_id: "CTR-2025-08",
    fpo_id: "FPO-SAHYADRI",
    buyer_name: "BigBasket",
    buyer_requires_t: 60.0,
    crop: "tomato",
    grade: "Grade A",
    due_date: "2025-04-20",
    contract_quantity_t: 60.0,
    confidence: 0.80,
    lower_t: 64.2,
    upper_t: 78.5,
    interval_t: { lower: 64.2, upper: 78.5 },
    point_t: 71.3,
    point_estimate_t: 71.3,
    shortfall_risk: 0.12,
    status: "GREEN",
    recommended_t: 60.0,
    recommended_commitment_t: 60.0,
    message: "Safe to commit — pessimistic case (64.2 t) clears the contract requirement.",
    low_information: false,
    drivers: [
      { label: "Vigorous Canopy Development: NDVI exceeds historical seasonal benchmark across 85% of plots", direction: "positive" },
      { label: "High Drip Irrigation Coverage: Micro-irrigation installed on 90% of member tomato plots", direction: "positive" },
    ],
    model_version: "v1.0-gbdt",
    calibration_version: "v1.0-split-conformal",
    calibration_size: 150,
    calib_size: 150,
    backtest_coverage: 0.82,
    input_hash: "a58b29c1d9b3524f280b08053a2efd6d84d7a8d56b0d5c0b053a2efd6d84d7a8",
    created_at: new Date().toISOString(),
  },
  {
    id: "SUG-2025-09",
    suggestion_id: "SUG-2025-09",
    contract_id: "CTR-2025-09",
    fpo_id: "FPO-SAHYADRI",
    buyer_name: "Sahyadri Mega Food Park",
    buyer_requires_t: 80.0,
    crop: "paddy",
    grade: "Grade A",
    due_date: "2025-05-10",
    contract_quantity_t: 80.0,
    confidence: 0.80,
    lower_t: 52.0,
    upper_t: 68.4,
    interval_t: { lower: 52.0, upper: 68.4 },
    point_t: 60.1,
    point_estimate_t: 60.1,
    shortfall_risk: 0.88,
    status: "AMBER",
    recommended_t: 52.0,
    recommended_commitment_t: 52.0,
    message: "Caution: Thin data detected. Commit 52.0 t now. Committing 80 t carries 88% default risk.",
    low_information: true,
    drivers: [
      { label: "Thin Plot Sample: Limited calibration observations available for late-season rabi paddy", direction: "neutral" },
      { label: "Rainfed Moisture Vulnerability: 40% of registered plots lack canal/drip backup", direction: "negative" },
    ],
    model_version: "v1.0-gbdt",
    calibration_version: "v1.0-split-conformal",
    calibration_size: 60,
    calib_size: 60,
    backtest_coverage: 0.78,
    input_hash: "9b3524f280b08053a2efd6d84d7a8d56b0d5c0b053a2efd6d84d7a8a58b29c1d",
    created_at: new Date().toISOString(),
  },
];

export const backtestReports: Record<string, BacktestReport> = {
  onion: {
    crop: "onion",
    held_out_season: "2024-RB",
    calib_size: 150,
    test_size: 150,
    gate_status: "OPEN",
    nominal_80: {
      nominal: 0.80,
      empirical_coverage: 0.85,
      passed: true,
      mean_width: 15.7,
      winkler_score: 18.2,
    },
    nominal_90: {
      nominal: 0.90,
      empirical_coverage: 0.92,
      passed: true,
      mean_width: 24.3,
      winkler_score: 25.1,
    },
    stratum_coverage: { "low_ndvi": 0.84, "mid_ndvi": 0.86, "high_ndvi": 0.85 },
    stratum_passed: true,
  },
  tomato: {
    crop: "tomato",
    held_out_season: "2024-RB",
    calib_size: 150,
    test_size: 150,
    gate_status: "OPEN",
    nominal_80: {
      nominal: 0.80,
      empirical_coverage: 0.82,
      passed: true,
      mean_width: 14.3,
      winkler_score: 16.5,
    },
    nominal_90: {
      nominal: 0.90,
      empirical_coverage: 0.89,
      passed: true,
      mean_width: 21.0,
      winkler_score: 22.8,
    },
    stratum_coverage: { "low_ndvi": 0.81, "mid_ndvi": 0.83, "high_ndvi": 0.82 },
    stratum_passed: true,
  },
  paddy: {
    crop: "paddy",
    held_out_season: "2024-RB",
    calib_size: 60,
    test_size: 60,
    gate_status: "OPEN",
    nominal_80: {
      nominal: 0.80,
      empirical_coverage: 0.78,
      passed: true,
      mean_width: 16.4,
      winkler_score: 19.1,
    },
    nominal_90: {
      nominal: 0.90,
      empirical_coverage: 0.88,
      passed: true,
      mean_width: 25.2,
      winkler_score: 27.0,
    },
    stratum_coverage: { "low_ndvi": 0.77, "mid_ndvi": 0.79, "high_ndvi": 0.78 },
    stratum_passed: true,
  },
};

export let auditEvents: AuditEvent[] = [
  {
    id: 1,
    entity: "contract",
    entity_id: "CTR-2025-07",
    event: "SUGGESTION_GENERATED",
    payload: {
      status: "AMBER",
      recommended_t: 72.4,
      interval: [72.4, 88.1],
      shortfall_risk: 0.91,
      model_version: "v1.0-gbdt",
    },
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 2,
    entity: "backtest",
    entity_id: "onion:2024-RB",
    event: "GATE_EVALUATED",
    payload: {
      gate_status: "OPEN",
      nominal_80: 0.85,
      nominal_90: 0.92,
    },
    created_at: new Date(Date.now() - 7200000).toISOString(),
  },
];
