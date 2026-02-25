const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const API_ENDPOINTS = {
  DESIGN_REQUEST: `${API_BASE}/api/design/request`,
  PIPELINES: `${API_BASE}/api/pipelines`,
  RUNS: `${API_BASE}/api/runs`,
  METRICS: `${API_BASE}/api/metrics`,
  FAILURES: `${API_BASE}/api/failures`,
  ACTIVITIES: `${API_BASE}/api/activities`,
  PREDEFINED_PIPELINES: `${API_BASE}/api/predefined-pipelines`,
  HEALTH: `${API_BASE}/health`,
  VALIDATE: `${API_BASE}/api/validate`,
  FEASIBILITY_POLICY: `${API_BASE}/api/feasibility/policy`,
  FEASIBILITY_GENERATE: `${API_BASE}/api/feasibility/generate`,
  SAFETY_VALIDATE: `${API_BASE}/api/safety/validate-execution`,
  ELIGIBILITY_MATRIX: `${API_BASE}/api/eligibility/matrix`,
};

export interface DesignRequest {
  data_profile: {
    type: 'tabular' | 'text' | 'image' | 'time-series';
    size_mb?: number;
    features?: number;
    label_type?: string;
  };
  objective: 'accuracy' | 'robustness' | 'speed' | 'cost';
  constraints: {
    max_cost_usd: number;
    max_carbon_kg: number;
    max_latency_ms: number;
    compliance_level: 'low' | 'regulated' | 'high';
  };
  deployment: 'batch' | 'realtime' | 'edge';
  retraining: 'time' | 'drift' | 'none';
  name?: string;
}

export interface PipelineDesign {
  rank: number;
  model: string;
  model_family: string;
  estimated_accuracy: number;
  estimated_cost: number;
  estimated_carbon: number;
  estimated_latency: number;
  meets_constraints: boolean;
  explanation: string;
}

export interface DesignResponse {
  pipeline_id: string;
  name: string;
  designs: PipelineDesign[];
  request_id: string;
  timestamp: string;
  feasibility: {
    is_feasible: boolean;
    violations?: string[];
    suggestions?: string[];
  };
}

export async function fetchDesign(request: DesignRequest): Promise<DesignResponse> {
  const response = await fetch(API_ENDPOINTS.DESIGN_REQUEST, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Design request failed');
  }
  return response.json();
}

export async function fetchPipelines() {
  const response = await fetch(API_ENDPOINTS.PIPELINES);
  const data = await response.json();
  return data.pipelines || [];
}

export async function fetchPipelineById(pipelineId: string) {
  const response = await fetch(`${API_ENDPOINTS.PIPELINES}/${pipelineId}`);
  return response.json();
}

export async function executePipeline(pipelineId: string) {
  const response = await fetch(`${API_ENDPOINTS.PIPELINES}/${pipelineId}/execute`, {
    method: 'POST',
  });
  return response.json();
}

export async function fetchPipelineRuns(pipelineId?: string) {
  const url = pipelineId 
    ? `${API_ENDPOINTS.RUNS}?pipeline_id=${pipelineId}`
    : API_ENDPOINTS.RUNS;
  const response = await fetch(url);
  const data = await response.json();
  return data.runs || [];
}

export async function fetchActivities() {
  const response = await fetch(API_ENDPOINTS.ACTIVITIES);
  const data = await response.json();
  return data.activities || [];
}

export async function fetchFailures() {
  const response = await fetch(API_ENDPOINTS.FAILURES);
  const data = await response.json();
  return data.failures || [];
}

export async function fetchMetrics() {
  const response = await fetch(API_ENDPOINTS.METRICS);
  return response.json();
}

export async function fetchPredefinedPipelines() {
  const response = await fetch(API_ENDPOINTS.PREDEFINED_PIPELINES);
  const data = await response.json();
  return data.pipelines || [];
}

export async function checkHealth() {
  try {
    const response = await fetch(API_ENDPOINTS.HEALTH);
    return response.ok;
  } catch {
    return false;
  }
}

// ============================================
// VALIDATION & FEASIBILITY API
// ============================================

export interface ValidationResult {
  is_valid: boolean;
  violations: Array<{
    constraint: string;
    value: any;
    required: any;
    severity: 'hard' | 'soft';
    message: string;
  }>;
  suggestions: Array<{
    constraint: string;
    current_value: any;
    suggested_value: any;
    reason: string;
    priority: number;
  }>;
  feasibility_score: number;
}

export async function validateConstraints(request: Partial<DesignRequest>): Promise<ValidationResult> {
  const response = await fetch(API_ENDPOINTS.VALIDATE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  return response.json();
}

export interface FeasibilityPolicy {
  request_id: string;
  eligible_model_families: string[];
  hard_constraints: string[];
  soft_constraints: string[];
  required_monitors: string[];
}

export async function getFeasibilityPolicy(request: Partial<DesignRequest>): Promise<FeasibilityPolicy> {
  const response = await fetch(API_ENDPOINTS.FEASIBILITY_POLICY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  return response.json();
}

export interface PipelineCandidate {
  id: string;
  name: string;
  description: string;
  model_families: string[];
  estimated_cost: number;
  estimated_carbon: number;
  estimated_latency_ms: number;
  estimated_accuracy: number;
  violates_constraints: Array<{ constraint: string; message: string }>;
}

export interface CandidatesResponse {
  candidates: PipelineCandidate[];
  feasible_count: number;
  total_count: number;
}

export async function generateCandidates(request: Partial<DesignRequest>): Promise<CandidatesResponse> {
  const response = await fetch(API_ENDPOINTS.FEASIBILITY_GENERATE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  return response.json();
}

export interface SafetyValidation {
  can_execute: boolean;
  violations: Array<{ constraint: string; message: string; severity: string }>;
  warnings: Array<{ type: string; message: string }>;
}

export async function validateExecution(
  pipeline: { estimated_cost: number; estimated_carbon: number; estimated_latency_ms: number },
  constraints: { max_cost_usd: number; max_carbon_kg: number; max_latency_ms: number },
  force?: boolean
): Promise<SafetyValidation> {
  const response = await fetch(API_ENDPOINTS.SAFETY_VALIDATE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pipeline, constraints, force: force || false }),
  });
  return response.json();
}

export interface ModelFamily {
  family: string;
  name: string;
  description: string;
  cost_range: [number, number];
  carbon_per_run: number;
  latency_ms: number;
  accuracy_range: [number, number];
  requires_gpu: boolean;
  supported_data_types?: string[];
}

export async function getEligibilityMatrix(): Promise<{ model_families: ModelFamily[] }> {
  const response = await fetch(API_ENDPOINTS.ELIGIBILITY_MATRIX);
  return response.json();
}

// ============================================
// DATASET PROFILING API
// ============================================

export interface DatasetProfileRequest {
  source: 'upload' | 'connection' | 'existing';
  file_name?: string;
  file_type?: 'csv' | 'parquet' | 'json' | 'image' | 'text';
  file_size_mb?: number;
  dataset_id?: string;
  connection_config?: Record<string, any>;
}

export interface DatasetProfile {
  id: string;
  name: string;
  source: string;
  type: 'tabular' | 'text' | 'image' | 'time-series';
  size_mb: number;
  rows?: number;
  columns?: number;
  features?: number;
  label_type?: string;
  label_present: boolean;
  missing_values: number;
  missing_percentage: number;
  class_balance?: Record<string, number>;
  pii_detected: boolean;
  pii_fields?: string[];
  inferred_task?: string;
  profile_timestamp: string;
}

export interface DatasetValidation {
  is_valid: boolean;
  violations: Array<{
    constraint: string;
    message: string;
    severity: 'hard' | 'soft';
  }>;
  suggestions: Array<{
    reason: string;
    suggested_action: string;
    priority: number;
  }>;
}

export async function profileDataset(request: DatasetProfileRequest): Promise<{ dataset: DatasetProfile }> {
  const response = await fetch(`${API_BASE}/api/datasets/profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  return response.json();
}

export async function validateDataset(
  dataset: Partial<DatasetProfile>,
  constraints?: Record<string, any>
): Promise<DatasetValidation> {
  const response = await fetch(`${API_BASE}/api/datasets/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dataset, constraints }),
  });
  return response.json();
}

export async function fetchDatasets(): Promise<{ datasets: DatasetProfile[] }> {
  const response = await fetch(`${API_BASE}/api/datasets`);
  return response.json();
}

export async function fetchDatasetById(datasetId: string): Promise<{ dataset: DatasetProfile }> {
  const response = await fetch(`${API_BASE}/api/datasets/${datasetId}`);
  return response.json();
}

// ============================================
// TRAINING EXECUTION API
// ============================================

export interface TrainingRequest {
  pipeline_id: string;
  dataset_id: string;
  constraints: {
    max_cost_usd: number;
    max_carbon_kg: number;
    max_latency_ms: number;
    compliance_level: string;
  };
  estimated_cost: number;
  estimated_carbon: number;
  estimated_time_seconds: number;
}

export interface TrainingRun {
  run_id: string;
  pipeline_id: string;
  status: 'running' | 'completed' | 'cancelled' | 'failed';
  progress: number;
  current_step?: string;
  cost_spent: number;
  carbon_used: number;
  elapsed_time_seconds: number;
  estimated_total_time_seconds?: number;
  metrics?: {
    accuracy?: number;
    f1?: number;
    precision?: number;
    recall?: number;
  };
  constraint_violations?: Array<{
    constraint: string;
    message: string;
    value: number;
    limit: number;
  }>;
  artifacts?: {
    model?: string;
    pipeline?: string;
    config?: string;
  };
}

export async function startTraining(request: TrainingRequest): Promise<{ run_id: string; status: string }> {
  const response = await fetch(`${API_BASE}/api/training/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  return response.json();
}

export async function getTrainingStatus(runId: string): Promise<{ run: TrainingRun }> {
  const response = await fetch(`${API_BASE}/api/training/${runId}`);
  return response.json();
}

export async function stopTraining(runId: string): Promise<{ status: string }> {
  const response = await fetch(`${API_BASE}/api/training/${runId}/stop`, {
    method: 'POST',
  });
  return response.json();
}
