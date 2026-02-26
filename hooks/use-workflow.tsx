'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export type LifecycleState = 
  | 'DATASET_UPLOADED'
  | 'DATASET_PROFILED'
  | 'DATASET_VALIDATED'
  | 'CONSTRAINTS_VALIDATED'
  | 'FEASIBILITY_APPROVED'
  | 'CANDIDATES_GENERATED'
  | 'EXECUTION_APPROVED'
  | 'TRAINING_RUNNING'
  | 'TRAINING_COMPLETED'
  | 'TRAINING_BLOCKED'
  | 'TRAINING_KILLED'

export interface ValidationError {
  code: string
  message: string
  action: string
}

export interface ConstraintViolation {
  metric: string
  estimated: number
  limit: number
  suggestion: string
}

export interface ProjectState {
  project_id: string
  name: string
  current_state: LifecycleState | null
  allowed_next_states: LifecycleState[]
  is_blocked: boolean
  blocking_errors: ValidationError[]
  validation_errors: ValidationError[]
  constraints: Record<string, any>
  profile_info: Record<string, any>
  dataset_info: Record<string, any>
}

export interface TrainingPlan {
  estimated_cost_usd: number
  estimated_carbon_kg: number
  estimated_time_ms: number
  peak_memory_mb: number
  violations: ConstraintViolation[]
}

const STATE_ORDER: LifecycleState[] = [
  'DATASET_UPLOADED',
  'DATASET_PROFILED',
  'DATASET_VALIDATED',
  'CONSTRAINTS_VALIDATED',
  'FEASIBILITY_APPROVED',
  'CANDIDATES_GENERATED',
  'EXECUTION_APPROVED',
  'TRAINING_RUNNING',
  'TRAINING_COMPLETED',
]

const PAGE_TO_STATE: Record<string, LifecycleState> = {
  '/datasets/new': 'DATASET_UPLOADED',
  '/datasets/profile': 'DATASET_PROFILED',
  '/datasets/validate': 'DATASET_VALIDATED',
  '/design/constraints': 'CONSTRAINTS_VALIDATED',
  '/design/results': 'CANDIDATES_GENERATED',
  '/design/review': 'FEASIBILITY_APPROVED',
  '/train/confirm': 'EXECUTION_APPROVED',
  '/train/running': 'TRAINING_RUNNING',
  '/train/result': 'TRAINING_COMPLETED',
}

interface WorkflowContextType {
  projectId: string | null
  projectState: ProjectState | null
  isLoading: boolean
  error: string | null
  createProject: (name: string) => Promise<string | null>
  loadProject: (projectId: string) => Promise<void>
  transitionState: (targetState: LifecycleState, metadata?: any) => Promise<boolean>
  validatePageAccess: (page: string) => Promise<{ allowed: boolean; reason?: string; blocking_errors?: ValidationError[] }>
  profileDataset: (data: any) => Promise<boolean>
  validateDataset: (complianceLevel: string) => Promise<{ valid: boolean; errors: ValidationError[] }>
  planTraining: (modelType: string, datasetRows: number) => Promise<{ approved: boolean; violations: ConstraintViolation[] }>
  startTraining: (pipelineId: string) => Promise<boolean>
  getTrainingStatus: () => Promise<any>
  stopTraining: () => Promise<boolean>
}

const WorkflowContext = createContext<WorkflowContextType | undefined>(undefined)

export function WorkflowProvider({ children }: { children: ReactNode }) {
  const [projectId, setProjectId] = useState<string | null>(null)
  const [projectState, setProjectState] = useState<ProjectState | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('system2ml_token')
    }
    return null
  }

  const createProject = async (name: string): Promise<string | null> => {
    setIsLoading(true)
    setError(null)
    try {
      const token = getToken()
      const res = await fetch(`${API_URL}/api/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name }),
      })
      if (res.ok) {
        const data = await res.json()
        setProjectId(data.project_id)
        localStorage.setItem('system2ml_project_id', data.project_id)
        await loadProject(data.project_id)
        return data.project_id
      }
    } catch (e: any) {
      setError(e.message)
    }
    setIsLoading(false)
    return null
  }

  const loadProject = async (projectId: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const token = getToken()
      const res = await fetch(`${API_URL}/api/lifecycle/state/${projectId}`, {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      })
      if (res.ok) {
        const data = await res.json()
        setProjectState(data)
        setProjectId(projectId)
        localStorage.setItem('system2ml_project_id', projectId)
      }
    } catch (e: any) {
      setError(e.message)
    }
    setIsLoading(false)
  }

  const transitionState = async (targetState: LifecycleState, metadata?: any): Promise<boolean> => {
    if (!projectId) return false
    setIsLoading(true)
    try {
      const token = getToken()
      const res = await fetch(`${API_URL}/api/lifecycle/transition/${projectId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ target_state: targetState, metadata }),
      })
      if (res.ok) {
        await loadProject(projectId)
        return true
      }
    } catch (e: any) {
      setError(e.message)
    }
    setIsLoading(false)
    return false
  }

  const validatePageAccess = async (page: string): Promise<{ allowed: boolean; reason?: string; blocking_errors?: ValidationError[] }> => {
    if (!projectId) {
      return { allowed: false, reason: 'No project selected' }
    }
    try {
      const token = getToken()
      const res = await fetch(`${API_URL}/api/lifecycle/validate/${projectId}?requested_page=${encodeURIComponent(page)}`, {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      })
      if (res.ok) {
        return await res.json()
      }
    } catch (e: any) {
      setError(e.message)
    }
    return { allowed: false, reason: 'Validation failed' }
  }

  const profileDataset = async (data: any): Promise<boolean> => {
    if (!projectId) return false
    setIsLoading(true)
    try {
      const token = getToken()
      const res = await fetch(`${API_URL}/api/datasets/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ project_id: projectId, ...data }),
      })
      if (res.ok) {
        const result = await res.json()
        if (result.status === 'success') {
          await loadProject(projectId)
          return true
        }
      }
    } catch (e: any) {
      setError(e.message)
    }
    setIsLoading(false)
    return false
  }

  const validateDataset = async (complianceLevel: string): Promise<{ valid: boolean; errors: ValidationError[] }> => {
    if (!projectId) return { valid: false, errors: [] }
    setIsLoading(true)
    try {
      const token = getToken()
      const res = await fetch(`${API_URL}/api/datasets/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ project_id: projectId, compliance_level: complianceLevel }),
      })
      if (res.ok) {
        const result = await res.json()
        await loadProject(projectId)
        return { valid: result.status === 'valid', errors: result.errors || [] }
      }
    } catch (e: any) {
      setError(e.message)
    }
    setIsLoading(false)
    return { valid: false, errors: [] }
  }

  const planTraining = async (modelType: string, datasetRows: number): Promise<{ approved: boolean; violations: ConstraintViolation[] }> => {
    if (!projectId) return { approved: false, violations: [] }
    setIsLoading(true)
    try {
      const token = getToken()
      const res = await fetch(`${API_URL}/api/training/plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ project_id: projectId, model_type: modelType, dataset_rows: datasetRows }),
      })
      if (res.ok) {
        const result = await res.json()
        await loadProject(projectId)
        return { approved: result.status === 'approved', violations: result.violations || [] }
      }
    } catch (e: any) {
      setError(e.message)
    }
    setIsLoading(false)
    return { approved: false, violations: [] }
  }

  const startTraining = async (pipelineId: string): Promise<boolean> => {
    if (!projectId) return false
    setIsLoading(true)
    try {
      const token = getToken()
      const res = await fetch(`${API_URL}/api/training/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ project_id: projectId, pipeline_id: pipelineId }),
      })
      if (res.ok) {
        const result = await res.json()
        if (result.status === 'started') {
          await loadProject(projectId)
          return true
        }
      }
    } catch (e: any) {
      setError(e.message)
    }
    setIsLoading(false)
    return false
  }

  const getTrainingStatus = async () => {
    if (!projectId) return null
    try {
      const token = getToken()
      const res = await fetch(`${API_URL}/api/training/status/${projectId}`, {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      })
      if (res.ok) {
        return await res.json()
      }
    } catch (e: any) {
      setError(e.message)
    }
    return null
  }

  const stopTraining = async (): Promise<boolean> => {
    if (!projectId) return false
    setIsLoading(true)
    try {
      const token = getToken()
      const res = await fetch(`${API_URL}/api/training/stop/${projectId}`, {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      })
      if (res.ok) {
        await loadProject(projectId)
        return true
      }
    } catch (e: any) {
      setError(e.message)
    }
    setIsLoading(false)
    return false
  }

  useEffect(() => {
    const savedProjectId = localStorage.getItem('system2ml_project_id')
    if (savedProjectId) {
      loadProject(savedProjectId)
    }
  }, [])

  return (
    <WorkflowContext.Provider
      value={{
        projectId,
        projectState,
        isLoading,
        error,
        createProject,
        loadProject,
        transitionState,
        validatePageAccess,
        profileDataset,
        validateDataset,
        planTraining,
        startTraining,
        getTrainingStatus,
        stopTraining,
      }}
    >
      {children}
    </WorkflowContext.Provider>
  )
}

export function useWorkflow() {
  const context = useContext(WorkflowContext)
  if (context === undefined) {
    throw new Error('useWorkflow must be used within a WorkflowProvider')
  }
  return context
}

export { PAGE_TO_STATE, STATE_ORDER }
