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
