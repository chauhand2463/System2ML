// User & Organization Types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'admin' | 'engineer' | 'viewer' | 'auditor';
  organizationId: string;
  createdAt: Date;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  tier: 'starter' | 'pro' | 'enterprise';
  members: User[];
  createdAt: Date;
}

// Pipeline Types
export interface PipelineNode {
  id: string;
  type: 'source' | 'transform' | 'model' | 'sink' | 'monitor';
  name: string;
  config: Record<string, any>;
  inputs: string[];
  outputs: string[];
  position?: { x: number; y: number };
}

export interface Pipeline {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  nodes: PipelineNode[];
  edges: Array<{ source: string; target: string }>;
  status: 'draft' | 'active' | 'paused' | 'archived';
  version: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
}

// Pipeline Run Types
export interface PipelineRun {
  id: string;
  pipelineId: string;
  pipelineVersion: number;
  status: 'running' | 'success' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  totalRows: number;
  errorRows?: number;
  metrics: Record<string, number>;
  logs?: string;
}

// Failure Memory Types
export interface FailureCase {
  id: string;
  organizationId: string;
  pipelineId: string;
  runId: string;
  errorType: string;
  errorMessage: string;
  stackTrace?: string;
  suggestedFix: string;
  frequency: number;
  lastOccurred: Date;
  isResolved: boolean;
  resolvedBy?: string;
  resolution?: string;
}

// Design Proposal Types
export interface AIDesignProposal {
  id: string;
  pipelineId: string;
  proposedChanges: PipelineNode[];
  rationale: string;
  expectedBenefit: string;
  riskLevel: 'low' | 'medium' | 'high';
  explainability: {
    reasoning: string[];
    dataSupport: string[];
    alternatives: string[];
  };
  createdAt: Date;
  status: 'pending' | 'approved' | 'rejected' | 'implemented';
}

// Monitoring & Drift Types
export interface DataDriftAlert {
  id: string;
  pipelineId: string;
  nodeId: string;
  metric: string;
  baselineValue: number;
  currentValue: number;
  driftPercentage: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  detectedAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
}

export interface ModelMetrics {
  pipelineId: string;
  timestamp: Date;
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1Score?: number;
  latencyP50?: number;
  latencyP99?: number;
  throughput?: number;
  errorRate?: number;
}

// Approvals & Governance Types
export interface ApprovalRequest {
  id: string;
  pipelineId: string;
  proposalId: string;
  changeDescription: string;
  proposedBy: string;
  createdAt: Date;
  status: 'pending' | 'approved' | 'rejected' | 'changes_requested';
  reviewedBy?: string;
  reviewedAt?: Date;
  comments: Array<{ author: string; text: string; timestamp: Date }>;
  diffView: {
    before: PipelineNode[];
    after: PipelineNode[];
  };
}

export interface GovernanceEvent {
  id: string;
  organizationId: string;
  eventType: 'pipeline_created' | 'pipeline_modified' | 'pipeline_deployed' | 'failure_resolved' | 'approval_granted' | 'model_drift_detected';
  resourceId: string;
  actedBy: string;
  details: Record<string, any>;
  timestamp: Date;
}

// Cost & Carbon Types
export interface ResourceUsage {
  pipelineId: string;
  date: Date;
  computeHours: number;
  dataProcessed: number; // in GB
  costUSD: number;
  carbonTonsEquivalent: number;
}

// Dashboard Types
export interface DashboardKPI {
  label: string;
  value: number | string;
  change?: number;
  unit?: string;
  trend?: 'up' | 'down' | 'neutral';
}

export interface Activity {
  id: string;
  type: 'pipeline' | 'failure' | 'approval' | 'deployment' | 'alert';
  title: string;
  description: string;
  actor: string;
  timestamp: Date;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  actionable?: boolean;
}
