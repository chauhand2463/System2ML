'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'

export type DataType = 'tabular' | 'text' | 'image' | 'time-series'
export type Objective = 'accuracy' | 'robustness' | 'speed' | 'cost'
export type Deployment = 'batch' | 'realtime' | 'edge'
export type ComplianceLevel = 'none' | 'standard' | 'regulated' | 'highly_regulated'
export type PipelineStatus = 'draft' | 'designed' | 'pending_training' | 'training' | 'completed' | 'failed'
export type RunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'quarantined' | 'killed' | 'stopped' | 'blocked'

export interface DatasetProfile {
  id: string
  name: string
  source: 'upload' | 'connection' | 'existing'
  type: DataType
  sizeMb: number
  rows?: number
  columns?: number
  features?: number
  labelType?: string
  labelPresent: boolean
  missingValues: number
  classBalance?: Record<string, number>
  piiDetected: boolean
  piiFields?: string[]
  createdAt: string
  inferredTask?: string
}

export interface UserConstraints {
  maxCostUsd: number
  maxCarbonKg: number
  maxLatencyMs: number
  complianceLevel: ComplianceLevel
  objective: Objective
  deployment: Deployment
}

export interface PipelineCandidate {
  id: string
  name: string
  description: string
  modelFamily: string
  estimatedCost: number
  estimatedCarbon: number
  estimatedLatencyMs: number
  estimatedAccuracy: number
  violatesConstraints: Array<{ constraint: string; message: string }>
  isFeasible: boolean
}

export interface TrainingRun {
  id: string
  pipelineId: string
  status: RunStatus
  startTime: string
  endTime?: string
  progress: number
  currentStep?: string
  costSpent: number
  carbonUsed: number
  elapsedTime: number
  estimatedTotalTime?: number
  metrics?: {
    accuracy?: number
    f1?: number
    precision?: number
    recall?: number
  }
  constraintViolations?: Array<{ constraint: string; message: string; value: number; limit: number }>
  artifacts?: {
    model?: string
    pipeline?: string
    config?: string
  }
}

interface DesignState {
  dataset: DatasetProfile | null
  constraints: UserConstraints
  selectedPipeline: PipelineCandidate | null
  trainingRun: TrainingRun | null
  designStep: 'input' | 'constraints' | 'preferences' | 'review' | 'results' | 'confirm' | 'running' | 'result'
  pipelineCandidates: PipelineCandidate[]
  feasibilityPassed: boolean
  safetyGatePassed: boolean
  isLoading: boolean
}

interface DesignContextType extends DesignState {
  setDataset: (dataset: DatasetProfile | null) => void
  setConstraints: (constraints: Partial<UserConstraints>) => void
  setSelectedPipeline: (pipeline: PipelineCandidate | null) => void
  setTrainingRun: (run: TrainingRun | null) => void
  setDesignStep: (step: DesignState['designStep']) => void
  setPipelineCandidates: (candidates: PipelineCandidate[]) => void
  setFeasibilityPassed: (passed: boolean) => void
  setSafetyGatePassed: (passed: boolean) => void
  setIsLoading: (loading: boolean) => void
  resetDesign: () => void
  canProceedToDesign: () => boolean
  canProceedToTraining: () => boolean
}

const defaultConstraints: UserConstraints = {
  maxCostUsd: 10,
  maxCarbonKg: 1.0,
  maxLatencyMs: 200,
  complianceLevel: 'standard',
  objective: 'accuracy',
  deployment: 'batch',
}

const DesignContext = createContext<DesignContextType | undefined>(undefined)

const STORAGE_KEY = 'system2ml_design_state'
const DATASET_KEY = 'system2ml_dataset'

export function DesignProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DesignState>({
    dataset: null,
    constraints: defaultConstraints,
    selectedPipeline: null,
    trainingRun: null,
    designStep: 'input',
    pipelineCandidates: [],
    feasibilityPassed: false,
    safetyGatePassed: false,
    isLoading: false,
  })

  // Load from localStorage on mount
  useEffect(() => {
    try {
      // Load design state
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setState(prev => ({
          ...prev,
          dataset: parsed.dataset || null,
          constraints: parsed.constraints || defaultConstraints,
          selectedPipeline: parsed.selectedPipeline || null,
          designStep: parsed.designStep || 'input',
          feasibilityPassed: parsed.feasibilityPassed || false,
          safetyGatePassed: parsed.safetyGatePassed || false,
          pipelineCandidates: parsed.pipelineCandidates || [],
        }))
      }

      // Load dataset if exists
      const datasetStored = localStorage.getItem(DATASET_KEY)
      if (datasetStored) {
        const parsed = JSON.parse(datasetStored)
        setState(prev => ({ ...prev, dataset: parsed }))
      }
    } catch (e) {
      console.error('Error loading design state:', e)
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(DATASET_KEY)
    }
  }, [])

  // Save to localStorage whenever state changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        dataset: state.dataset,
        constraints: state.constraints,
        selectedPipeline: state.selectedPipeline,
        designStep: state.designStep,
        feasibilityPassed: state.feasibilityPassed,
        safetyGatePassed: state.safetyGatePassed,
        pipelineCandidates: state.pipelineCandidates,
      }))

      // Also save dataset separately
      if (state.dataset) {
        localStorage.setItem(DATASET_KEY, JSON.stringify(state.dataset))
      }
    } catch (e) {
      console.error('Error saving design state:', e)
    }
  }, [state.dataset, state.constraints, state.selectedPipeline, state.designStep, state.feasibilityPassed, state.safetyGatePassed, state.pipelineCandidates])

  const setDataset = useCallback((dataset: DatasetProfile | null) => {
    setState(prev => ({ ...prev, dataset }))
    if (dataset) {
      localStorage.setItem(DATASET_KEY, JSON.stringify(dataset))
    }
  }, [])

  const setConstraints = useCallback((constraints: Partial<UserConstraints>) => {
    setState(prev => ({ ...prev, constraints: { ...prev.constraints, ...constraints } }))
  }, [])

  const setSelectedPipeline = useCallback((pipeline: PipelineCandidate | null) => {
    setState(prev => ({ ...prev, selectedPipeline: pipeline }))
  }, [])

  const setTrainingRun = useCallback((run: TrainingRun | null) => {
    setState(prev => ({ ...prev, trainingRun: run }))
  }, [])

  const setDesignStep = useCallback((step: DesignState['designStep']) => {
    setState(prev => ({ ...prev, designStep: step }))
  }, [])

  const setPipelineCandidates = useCallback((candidates: PipelineCandidate[]) => {
    setState(prev => ({ ...prev, pipelineCandidates: candidates }))
  }, [])

  const setFeasibilityPassed = useCallback((passed: boolean) => {
    setState(prev => ({ ...prev, feasibilityPassed: passed }))
  }, [])

  const setSafetyGatePassed = useCallback((passed: boolean) => {
    setState(prev => ({ ...prev, safetyGatePassed: passed }))
  }, [])

  const setIsLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, isLoading: loading }))
  }, [])

  const resetDesign = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedPipeline: null,
      trainingRun: null,
      designStep: 'input',
      pipelineCandidates: [],
      feasibilityPassed: false,
      safetyGatePassed: false,
    }))
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  const canProceedToDesign = useCallback(() => {
    return state.dataset !== null
  }, [state.dataset])

  const canProceedToTraining = useCallback(() => {
    return (
      state.feasibilityPassed &&
      state.safetyGatePassed &&
      state.selectedPipeline !== null &&
      state.selectedPipeline.isFeasible
    )
  }, [state.feasibilityPassed, state.safetyGatePassed, state.selectedPipeline])

  return (
    <DesignContext.Provider
      value={{
        ...state,
        setDataset,
        setConstraints,
        setSelectedPipeline,
        setTrainingRun,
        setDesignStep,
        setPipelineCandidates,
        setFeasibilityPassed,
        setSafetyGatePassed,
        setIsLoading,
        resetDesign,
        canProceedToDesign,
        canProceedToTraining,
      }}
    >
      {children}
    </DesignContext.Provider>
  )
}

export function useDesign() {
  const context = useContext(DesignContext)
  if (context === undefined) {
    throw new Error('useDesign must be used within a DesignProvider')
  }
  return context
}
