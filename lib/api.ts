const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://system2ml-api.onrender.com';

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

// Helper function to check if API is configured
function isApiConfigured(): boolean {
  return !!API_BASE && API_BASE.length > 0;
}

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
  if (!isApiConfigured()) throw new Error('API not configured');
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
  if (!isApiConfigured()) return [];
  try {
    const response = await fetch(API_ENDPOINTS.PIPELINES);
    const data = await response.json();
    return data.pipelines || [];
  } catch {
    return [];
  }
}

export async function fetchPipelineById(pipelineId: string) {
  if (!isApiConfigured()) return { pipeline: null, designs: [] };
  try {
    const response = await fetch(`${API_ENDPOINTS.PIPELINES}/${pipelineId}`);
    return response.json();
  } catch {
    return { pipeline: null, designs: [] };
  }
}

export async function executePipeline(pipelineId: string) {
  if (!isApiConfigured()) return { error: 'API not configured' };
  try {
    const response = await fetch(`${API_ENDPOINTS.PIPELINES}/${pipelineId}/execute`, {
      method: 'POST',
    });
    return response.json();
  } catch {
    return { error: 'Failed to execute' };
  }
}

export async function fetchPipelineRuns(pipelineId?: string) {
  if (!isApiConfigured()) return [];
  try {
    const url = pipelineId 
      ? `${API_ENDPOINTS.RUNS}?pipeline_id=${pipelineId}`
      : API_ENDPOINTS.RUNS;
    const response = await fetch(url);
    const data = await response.json();
    return data.runs || [];
  } catch {
    return [];
  }
}

export async function fetchActivities() {
  if (!isApiConfigured()) return [];
  try {
    const response = await fetch(API_ENDPOINTS.ACTIVITIES);
    const data = await response.json();
    return data.activities || [];
  } catch {
    return [];
  }
}

export async function fetchFailures() {
  if (!isApiConfigured()) return [];
  try {
    const response = await fetch(API_ENDPOINTS.FAILURES);
    const data = await response.json();
    return data.failures || [];
  } catch {
    return [];
  }
}

export async function fetchMetrics() {
  if (!isApiConfigured()) return {};
  try {
    const response = await fetch(API_ENDPOINTS.METRICS);
    return response.json();
  } catch {
    return {};
  }
}

export async function fetchPredefinedPipelines() {
  if (!isApiConfigured()) return [];
  try {
    const response = await fetch(API_ENDPOINTS.PREDEFINED_PIPELINES);
    const data = await response.json();
    return data.pipelines || [];
  } catch {
    return [];
  }
}

export async function checkHealth() {
  if (!isApiConfigured()) return false;
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
  if (!isApiConfigured()) {
    return { is_valid: true, violations: [], suggestions: [], feasibility_score: 1 };
  }
  try {
    const response = await fetch(API_ENDPOINTS.VALIDATE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    return response.json();
  } catch {
    return { is_valid: true, violations: [], suggestions: [], feasibility_score: 1 };
  }
}

export interface FeasibilityPolicy {
  request_id: string;
  eligible_model_families: string[];
  hard_constraints: string[];
  soft_constraints: string[];
  required_monitors: string[];
}

export async function getFeasibilityPolicy(request: Partial<DesignRequest>): Promise<FeasibilityPolicy> {
  if (!isApiConfigured()) {
    return { 
      request_id: 'mock-id', 
      eligible_model_families: ['classical', 'compressed', 'small_deep', 'transformer'], 
      hard_constraints: ['max_cost_usd', 'max_carbon_kg'], 
      soft_constraints: ['max_latency_ms'], 
      required_monitors: ['cost', 'carbon', 'latency'] 
    };
  }
  try {
    const response = await fetch(API_ENDPOINTS.FEASIBILITY_POLICY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    return response.json();
  } catch {
    return { 
      request_id: '', 
      eligible_model_families: ['classical'], 
      hard_constraints: [], 
      soft_constraints: [], 
      required_monitors: [] 
    };
  }
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
  if (!isApiConfigured()) {
    // Return mock candidates for demo purposes
    const maxCost = request?.constraints?.max_cost_usd || 10;
    const maxCarbon = request?.constraints?.max_carbon_kg || 1.0;
    const maxLatency = request?.constraints?.max_latency_ms || 200;
    
    const mockCandidates = [
      { family: "Classical", cost: 0.5, carbon: 0.01, latency: 100, accuracy: 0.82 },
      { family: "Compressed", cost: 0.8, carbon: 0.03, latency: 200, accuracy: 0.85 },
      { family: "Small Deep", cost: 2.0, carbon: 0.1, latency: 150, accuracy: 0.88 },
      { family: "Transformer", cost: 5.0, carbon: 0.3, latency: 180, accuracy: 0.92 },
    ];
    
    const candidates = mockCandidates.map((m, i) => {
      const violates = [];
      if (m.cost > maxCost) violates.push({ constraint: "max_cost_usd", message: `$${m.cost} exceeds $${maxCost}` });
      if (m.carbon > maxCarbon) violates.push({ constraint: "max_carbon_kg", message: `${m.carbon}kg exceeds ${maxCarbon}kg` });
      if (m.latency > maxLatency) violates.push({ constraint: "max_latency_ms", message: `${m.latency}ms exceeds ${maxLatency}ms` });
      
      return {
        id: `mock-${i}`,
        name: `${m.family} ML Pipeline`,
        description: `Pipeline using ${m.family.toLowerCase()} models`,
        model_families: [m.family.toLowerCase().replace(" ", "_")],
        estimated_cost: m.cost,
        estimated_carbon: m.carbon,
        estimated_latency_ms: m.latency,
        estimated_accuracy: m.accuracy,
        violates_constraints: violates,
      };
    });
    
    const feasibleCount = candidates.filter(c => !c.violates_constraints.length).length;
    return { candidates, feasible_count: feasibleCount, total_count: candidates.length };
  }
  try {
    const response = await fetch(API_ENDPOINTS.FEASIBILITY_GENERATE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    return response.json();
  } catch {
    return { candidates: [], feasible_count: 0, total_count: 0 };
  }
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
  if (!isApiConfigured()) {
    return { can_execute: true, violations: [], warnings: [] };
  }
  try {
    const response = await fetch(API_ENDPOINTS.SAFETY_VALIDATE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pipeline, constraints, force: force || false }),
    });
    return response.json();
  } catch {
    return { can_execute: true, violations: [], warnings: [] };
  }
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
  if (!isApiConfigured()) {
    return { model_families: [] };
  }
  try {
    const response = await fetch(API_ENDPOINTS.ELIGIBILITY_MATRIX);
    return response.json();
  } catch {
    return { model_families: [] };
  }
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
  if (!isApiConfigured()) {
    return { dataset: { id: '', name: '', source: 'upload', type: 'tabular', size_mb: 0, label_present: false, missing_values: 0, missing_percentage: 0, pii_detected: false, profile_timestamp: '' } };
  }
  try {
    const response = await fetch(`${API_BASE}/api/datasets/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    return response.json();
  } catch {
    return { dataset: { id: '', name: '', source: 'upload', type: 'tabular', size_mb: 0, label_present: false, missing_values: 0, missing_percentage: 0, pii_detected: false, profile_timestamp: '' } };
  }
}

export async function validateDataset(
  dataset: Partial<DatasetProfile>,
  constraints?: Record<string, any>
): Promise<DatasetValidation> {
  if (!isApiConfigured()) {
    return { is_valid: true, violations: [], suggestions: [] };
  }
  try {
    const response = await fetch(`${API_BASE}/api/datasets/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataset, constraints }),
    });
    return response.json();
  } catch {
    return { is_valid: true, violations: [], suggestions: [] };
  }
}

export async function fetchDatasets(): Promise<{ datasets: DatasetProfile[] }> {
  if (!isApiConfigured()) return { datasets: [] };
  try {
    const response = await fetch(`${API_BASE}/api/datasets`);
    return response.json();
  } catch {
    return { datasets: [] };
  }
}

export async function fetchDatasetById(datasetId: string): Promise<{ dataset: DatasetProfile }> {
  if (!isApiConfigured()) return { dataset: { id: datasetId, name: '', source: 'existing', type: 'tabular', size_mb: 0, label_present: false, missing_values: 0, missing_percentage: 0, pii_detected: false, profile_timestamp: '' } };
  try {
    const response = await fetch(`${API_BASE}/api/datasets/${datasetId}`);
    return response.json();
  } catch {
    return { dataset: { id: datasetId, name: '', source: 'existing', type: 'tabular', size_mb: 0, label_present: false, missing_values: 0, missing_percentage: 0, pii_detected: false, profile_timestamp: '' } };
  }
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
  if (!isApiConfigured()) {
    return { run_id: '', status: 'error' };
  }
  try {
    const response = await fetch(`${API_BASE}/api/training/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    return response.json();
  } catch {
    return { run_id: '', status: 'error' };
  }
}

export async function getTrainingStatus(runId: string): Promise<{ run: TrainingRun }> {
  if (!isApiConfigured()) {
    return { run: { run_id: runId, pipeline_id: '', status: 'failed', progress: 0, cost_spent: 0, carbon_used: 0, elapsed_time_seconds: 0 } };
  }
  try {
    const response = await fetch(`${API_BASE}/api/training/${runId}`);
    return response.json();
  } catch {
    return { run: { run_id: runId, pipeline_id: '', status: 'failed', progress: 0, cost_spent: 0, carbon_used: 0, elapsed_time_seconds: 0 } };
  }
}

export async function stopTraining(runId: string): Promise<{ status: string }> {
  if (!isApiConfigured()) return { status: 'error' };
  try {
    const response = await fetch(`${API_BASE}/api/training/${runId}/stop`, {
      method: 'POST',
    });
    return response.json();
  } catch {
    return { status: 'error' };
  }
}
