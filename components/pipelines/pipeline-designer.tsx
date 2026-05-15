'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trash2, Plus, Save, RotateCcw, Check, X, Settings, Zap, Database, Cpu, HardDrive, Activity, Layers, Workflow, ArrowRight, Play, Pause, AlertTriangle, CheckCircle, Clock, GitBranch, FileCode, BookTemplate, Box, ExternalLink, Sparkles, History, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ApprovalDiffView } from '@/components/approvals/approval-diff-view'

export type NodeType = 
  | 'source' 
  | 'transform' 
  | 'model' 
  | 'sink' 
  | 'monitor'
  | 'validator'
  | 'splitter'
  | 'merger'
  | 'feature_engineering'
  | 'preprocessing'
  | 'rag'
  | 'etl'
  | 'elt'
  | 'streaming'
  | 'lambda'
  | 'kappa'
  | 'vectorstore'
  | 'embeddings'
  | 'api'
  | 'container'

export type NodeStatus = 'pending' | 'running' | 'completed' | 'failed'

export interface PipelineNode {
  id: string
  name: string
  type: NodeType
  position: { x: number; y: number }
  config: Record<string, any>
  inputs: string[]
  outputs: string[]
  status?: NodeStatus
}

export interface PipelineEdge {
  id: string
  source: string
  target: string
  sourcePort?: string
  targetPort?: string
}

export interface PipelineVersion {
  id: string
  version: number
  nodes: PipelineNode[]
  edges: PipelineEdge[]
  timestamp: Date
  changes?: { type: 'added' | 'removed' | 'modified'; path: string; oldValue?: string; newValue?: string }[]
}

interface PipelineDesignerProps {
  initialNodes?: PipelineNode[]
  initialEdges?: PipelineEdge[]
  onSave?: (nodes: PipelineNode[], edges: PipelineEdge[]) => void
}

interface NodeBookTemplate {
  label: string
  description: string
  color: string
  icon: any
  defaultConfig: Record<string, any>
  defaultInputs: string[]
  defaultOutputs: string[]
  configFields: ConfigField[]
}

interface ConfigField {
  name: string
  label: string
  type: 'text' | 'number' | 'select' | 'boolean' | 'json' | 'array'
  options?: string[]
  placeholder?: string
  description?: string
}

interface PipelineTemplate {
  id: string
  name: string
  description: string
  icon: any
  nodes: Omit<PipelineNode, 'id' | 'position'>[]
  edges: Omit<PipelineEdge, 'id'>[]
}

const NODE_TEMPLATES: Record<NodeType, NodeBookTemplate> = {
  source: {
    label: 'Data Source',
    description: 'Input data from various sources',
    color: 'bg-blue-500/20 border-blue-500',
    icon: Database,
    defaultConfig: { source_type: 'csv', path: '/data/input.csv' },
    defaultInputs: [],
    defaultOutputs: ['data'],
    configFields: [
      { name: 'source_type', label: 'Source Type', type: 'select', options: ['csv', 'json', 'parquet', 'api', 'database', 's3'] },
      { name: 'path', label: 'Path/URL', type: 'text', placeholder: '/data/input.csv' },
    ]
  },
  transform: {
    label: 'Transform',
    description: 'Data transformation operations',
    color: 'bg-purple-500/20 border-purple-500',
    icon: Layers,
    defaultConfig: { operation: 'normalize', columns: [] },
    defaultInputs: ['data'],
    defaultOutputs: ['transformed_data'],
    configFields: [
      { name: 'operation', label: 'Operation', type: 'select', options: ['normalize', 'scale', 'encode', 'filter', 'aggregate'] },
    ]
  },
  model: {
    label: 'ML Model',
    description: 'Machine learning model',
    color: 'bg-emerald-500/20 border-emerald-500',
    icon: Cpu,
    defaultConfig: { algorithm: 'random_forest', hyperparameters: {} },
    defaultInputs: ['training_data'],
    defaultOutputs: ['predictions', 'model'],
    configFields: [
      { name: 'algorithm', label: 'Algorithm', type: 'select', options: ['random_forest', 'xgboost', 'logistic_regression', 'neural_network'] },
    ]
  },
  sink: {
    label: 'Data Sink',
    description: 'Output destination',
    color: 'bg-orange-500/20 border-orange-500',
    icon: HardDrive,
    defaultConfig: { output_type: 'csv', path: '/output' },
    defaultInputs: ['data'],
    defaultOutputs: [],
    configFields: [
      { name: 'output_type', label: 'Output Type', type: 'select', options: ['csv', 'json', 'parquet', 'database'] },
      { name: 'path', label: 'Path', type: 'text' },
    ]
  },
  monitor: {
    label: 'Monitor',
    description: 'Monitor pipeline metrics',
    color: 'bg-cyan-500/20 border-cyan-500',
    icon: Activity,
    defaultConfig: { metrics: ['accuracy', 'latency'] },
    defaultInputs: ['metrics'],
    defaultOutputs: ['alerts'],
    configFields: [
      { name: 'metrics', label: 'Metrics', type: 'json', placeholder: '["accuracy", "latency"]' },
    ]
  },
  validator: {
    label: 'Validator',
    description: 'Data validation',
    color: 'bg-red-500/20 border-red-500',
    icon: CheckCircle,
    defaultConfig: { rules: [] },
    defaultInputs: ['data'],
    defaultOutputs: ['validated_data'],
    configFields: []
  },
  splitter: {
    label: 'Splitter',
    description: 'Split data flow',
    color: 'bg-amber-500/20 border-amber-500',
    icon: GitBranch,
    defaultConfig: { ratio: 0.8 },
    defaultInputs: ['data'],
    defaultOutputs: ['train_data', 'test_data'],
    configFields: [
      { name: 'ratio', label: 'Train Ratio', type: 'number', placeholder: '0.8' },
    ]
  },
  merger: {
    label: 'Merger',
    description: 'Merge data flows',
    color: 'bg-pink-500/20 border-pink-500',
    icon: Layers,
    defaultConfig: { method: 'concat' },
    defaultInputs: ['data1', 'data2'],
    defaultOutputs: ['merged_data'],
    configFields: [
      { name: 'method', label: 'Method', type: 'select', options: ['concat', 'join'] },
    ]
  },
  feature_engineering: {
    label: 'Feature Engineering',
    description: 'Create new features',
    color: 'bg-violet-500/20 border-violet-500',
    icon: Settings,
    defaultConfig: { operations: ['one_hot', 'scaling'] },
    defaultInputs: ['raw_data'],
    defaultOutputs: ['features'],
    configFields: []
  },
  preprocessing: {
    label: 'Preprocessing',
    description: 'Data preprocessing',
    color: 'bg-indigo-500/20 border-indigo-500',
    icon: Zap,
    defaultConfig: { steps: ['clean', 'impute'] },
    defaultInputs: ['raw_data'],
    defaultOutputs: ['clean_data'],
    configFields: []
  },
  rag: {
    label: 'RAG Pipeline',
    description: 'Retrieval-Augmented Generation',
    color: 'bg-violet-500/20 border-violet-500',
    icon: Workflow,
    defaultConfig: { vector_db: 'pinecone', chunk_size: 512 },
    defaultInputs: ['documents', 'query'],
    defaultOutputs: ['context', 'response'],
    configFields: []
  },
  etl: {
    label: 'ETL Pipeline',
    description: 'Extract, Transform, Load',
    color: 'bg-cyan-500/20 border-cyan-500',
    icon: Workflow,
    defaultConfig: { extract_method: 'database', transform_operations: ['clean'] },
    defaultInputs: ['raw_data'],
    defaultOutputs: ['processed_data'],
    configFields: []
  },
  elt: {
    label: 'ELT Pipeline',
    description: 'Extract, Load, Transform',
    color: 'bg-teal-500/20 border-teal-500',
    icon: Workflow,
    defaultConfig: {},
    defaultInputs: ['raw_data'],
    defaultOutputs: ['processed_data'],
    configFields: []
  },
  streaming: {
    label: 'Streaming',
    description: 'Real-time data streaming',
    color: 'bg-orange-500/20 border-orange-500',
    icon: Activity,
    defaultConfig: { source: 'kafka', window_size: '5m' },
    defaultInputs: ['stream'],
    defaultOutputs: ['processed_stream'],
    configFields: []
  },
  lambda: {
    label: 'Lambda',
    description: 'Serverless function',
    color: 'bg-yellow-500/20 border-yellow-500',
    icon: Zap,
    defaultConfig: { runtime: 'python3.10', memory: 512 },
    defaultInputs: ['event'],
    defaultOutputs: ['result'],
    configFields: []
  },
  kappa: {
    label: 'Kappa',
    description: 'Kappa architecture',
    color: 'bg-lime-500/20 border-lime-500',
    icon: Workflow,
    defaultConfig: {},
    defaultInputs: ['stream'],
    defaultOutputs: ['result'],
    configFields: []
  },
  vectorstore: {
    label: 'Vector Store',
    description: 'Vector database',
    color: 'bg-fuchsia-500/20 border-fuchsia-500',
    icon: Database,
    defaultConfig: { db_type: 'pinecone', dimension: 384 },
    defaultInputs: ['embeddings'],
    defaultOutputs: ['stored_vectors'],
    configFields: []
  },
  embeddings: {
    label: 'Embeddings',
    description: 'Text embeddings',
    color: 'bg-rose-500/20 border-rose-500',
    icon: Layers,
    defaultConfig: { model: 'sentence-transformers', dimension: 384 },
    defaultInputs: ['text'],
    defaultOutputs: ['embeddings'],
    configFields: []
  },
  api: {
    label: 'API',
    description: 'API endpoint',
    color: 'bg-sky-500/20 border-sky-500',
    icon: ExternalLink,
    defaultConfig: { endpoint: '/api/predict', method: 'POST' },
    defaultInputs: ['request'],
    defaultOutputs: ['response'],
    configFields: []
  },
  container: {
    label: 'Container',
    description: 'Docker container',
    color: 'bg-slate-500/20 border-slate-500',
    icon: Box,
    defaultConfig: { image: 'python:3.10', port: 8000 },
    defaultInputs: [],
    defaultOutputs: [],
    configFields: []
  },
}

const PIPELINE_TEMPLATES: PipelineTemplate[] = [
  {
    id: 'fraud-detection',
    name: 'Fraud Detection',
    description: 'Real-time transaction fraud detection pipeline',
    icon: AlertTriangle,
    nodes: [
      { name: 'Transaction Source', type: 'source', config: { source_type: 'api', path: '/api/transactions' }, inputs: [], outputs: ['transactions'] },
      { name: 'Preprocessing', type: 'preprocessing', config: { steps: ['clean', 'validate'] }, inputs: ['transactions'], outputs: ['clean_data'] },
      { name: 'Feature Engineering', type: 'feature_engineering', config: { operations: ['encode', 'scale'] }, inputs: ['clean_data'], outputs: ['features'] },
      { name: 'Fraud Model', type: 'model', config: { algorithm: 'xgboost' }, inputs: ['features'], outputs: ['predictions'] },
      { name: 'Monitor', type: 'monitor', config: { metrics: ['f1_score', 'precision', 'recall'] }, inputs: ['predictions'], outputs: ['alerts'] },
      { name: 'Results Sink', type: 'sink', config: { output_type: 'database' }, inputs: ['predictions'], outputs: [] },
    ],
    edges: [
      { source: '0', target: '1' },
      { source: '1', target: '2' },
      { source: '2', target: '3' },
      { source: '3', target: '4' },
      { source: '3', target: '5' },
    ],
  },
  {
    id: 'sentiment-analysis',
    name: 'Sentiment Analysis',
    description: 'NLP pipeline for analyzing customer sentiment',
    icon: Activity,
    nodes: [
      { name: 'Review Source', type: 'source', config: { source_type: 'api' }, inputs: [], outputs: ['reviews'] },
      { name: 'Preprocessing', type: 'preprocessing', config: { steps: ['clean', 'tokenize'] }, inputs: ['reviews'], outputs: ['clean_data'] },
      { name: 'Embeddings', type: 'embeddings', config: { model: 'sentence-transformers', dimension: 384 }, inputs: ['clean_data'], outputs: ['embeddings'] },
      { name: 'Sentiment Model', type: 'model', config: { algorithm: 'neural_network' }, inputs: ['embeddings'], outputs: ['sentiment'] },
      { name: 'Results Sink', type: 'sink', config: { output_type: 'json' }, inputs: ['sentiment'], outputs: [] },
    ],
    edges: [
      { source: '0', target: '1' },
      { source: '1', target: '2' },
      { source: '2', target: '3' },
      { source: '3', target: '4' },
    ],
  },
  {
    id: 'image-classification',
    name: 'Image Classification',
    description: 'Computer vision pipeline for image classification',
    icon: Cpu,
    nodes: [
      { name: 'Image Source', type: 'source', config: { source_type: 's3' }, inputs: [], outputs: ['images'] },
      { name: 'Preprocessing', type: 'preprocessing', config: { steps: ['resize', 'normalize'] }, inputs: ['images'], outputs: ['processed'] },
      { name: 'Image Classifier', type: 'model', config: { algorithm: 'neural_network' }, inputs: ['processed'], outputs: ['predictions'] },
      { name: 'Monitor', type: 'monitor', config: { metrics: ['accuracy'] }, inputs: ['predictions'], outputs: ['alerts'] },
      { name: 'Predictions Sink', type: 'sink', config: { output_type: 'json' }, inputs: ['predictions'], outputs: [] },
    ],
    edges: [
      { source: '0', target: '1' },
      { source: '1', target: '2' },
      { source: '2', target: '3' },
      { source: '2', target: '4' },
    ],
  },
  {
    id: 'time-series',
    name: 'Time Series Forecasting',
    description: 'Time series prediction pipeline',
    icon: Clock,
    nodes: [
      { name: 'Time Series Source', type: 'source', config: { source_type: 'csv', path: '/data/timeseries.csv' }, inputs: [], outputs: ['data'] },
      { name: 'Preprocessing', type: 'preprocessing', config: { steps: ['interpolate', 'resample'] }, inputs: ['data'], outputs: ['processed'] },
      { name: 'Feature Engineering', type: 'feature_engineering', config: { operations: ['lag', 'rolling'] }, inputs: ['processed'], outputs: ['features'] },
      { name: 'Forecast Model', type: 'model', config: { algorithm: 'random_forest' }, inputs: ['features'], outputs: ['forecast'] },
      { name: 'Results Sink', type: 'sink', config: { output_type: 'csv' }, inputs: ['forecast'], outputs: [] },
    ],
    edges: [
      { source: '0', target: '1' },
      { source: '1', target: '2' },
      { source: '2', target: '3' },
      { source: '3', target: '4' },
    ],
  },
  {
    id: 'rag-pipeline',
    name: 'RAG Pipeline',
    description: 'Retrieval-Augmented Generation for Q&A',
    icon: Workflow,
    nodes: [
      { name: 'Document Source', type: 'source', config: { source_type: 'database' }, inputs: [], outputs: ['documents'] },
      { name: 'ETL Pipeline', type: 'etl', config: { extract_method: 'database' }, inputs: ['documents'], outputs: ['processed'] },
      { name: 'Embeddings', type: 'embeddings', config: { model: 'sentence-transformers', dimension: 384 }, inputs: ['processed'], outputs: ['embeddings'] },
      { name: 'Vector Store', type: 'vectorstore', config: { db_type: 'pinecone' }, inputs: ['embeddings'], outputs: ['stored_vectors'] },
      { name: 'RAG Pipeline', type: 'rag', config: { vector_db: 'pinecone' }, inputs: ['stored_vectors'], outputs: ['response'] },
      { name: 'Response Sink', type: 'sink', config: { output_type: 'json' }, inputs: ['response'], outputs: [] },
    ],
    edges: [
      { source: '0', target: '1' },
      { source: '1', target: '2' },
      { source: '2', target: '3' },
      { source: '3', target: '4' },
      { source: '4', target: '5' },
    ],
  },
  {
    id: 'etl-pipeline',
    name: 'ETL Pipeline',
    description: 'Extract, Transform, Load data pipeline',
    icon: Layers,
    nodes: [
      { name: 'Data Source', type: 'source', config: { source_type: 'database' }, inputs: [], outputs: ['raw_data'] },
      { name: 'Validator', type: 'validator', config: { rules: ['not_null', 'unique'] }, inputs: ['raw_data'], outputs: ['validated_data'] },
      { name: 'Transform', type: 'transform', config: { operation: 'normalize' }, inputs: ['validated_data'], outputs: ['transformed_data'] },
      { name: 'ETL Pipeline', type: 'etl', config: { extract_method: 'database' }, inputs: ['transformed_data'], outputs: ['processed_data'] },
      { name: 'Data Sink', type: 'sink', config: { output_type: 'database' }, inputs: ['processed_data'], outputs: [] },
    ],
    edges: [
      { source: '0', target: '1' },
      { source: '1', target: '2' },
      { source: '2', target: '3' },
      { source: '3', target: '4' },
    ],
  },
]

function computeDiff(oldNodes: PipelineNode[], newNodes: PipelineNode[]): { type: 'added' | 'removed' | 'modified'; path: string; oldValue?: string; newValue?: string }[] {
  const changes: { type: 'added' | 'removed' | 'modified'; path: string; oldValue?: string; newValue?: string }[] = []
  const oldMap = new Map(oldNodes.map(n => [n.id, n]))
  const newMap = new Map(newNodes.map(n => [n.id, n]))

  for (const [id, node] of newMap) {
    if (!oldMap.has(id)) {
      changes.push({ type: 'added', path: `nodes.${node.name}`, newValue: `Added node: ${node.type}` })
    } else {
      const oldNode = oldMap.get(id)!
      if (JSON.stringify(oldNode.config) !== JSON.stringify(node.config)) {
        changes.push({ type: 'modified', path: `nodes.${node.name}.config`, oldValue: JSON.stringify(oldNode.config), newValue: JSON.stringify(node.config) })
      }
    }
  }

  for (const [id, node] of oldMap) {
    if (!newMap.has(id)) {
      changes.push({ type: 'removed', path: `nodes.${node.name}`, oldValue: `Removed node: ${node.type}` })
    }
  }

  return changes
}

export function PipelineDesigner({ initialNodes = [], initialEdges = [], onSave }: PipelineDesignerProps) {
  const [nodes, setNodes] = useState<PipelineNode[]>([])
  const [edges, setEdges] = useState<PipelineEdge[]>([])
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [showBookTemplates, setShowBookTemplates] = useState(false)
  const [showValidation, setShowValidation] = useState(false)
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [pipelineName, setPipelineName] = useState('My Pipeline')
  const [versions, setVersions] = useState<PipelineVersion[]>([])
  const [currentVersion, setCurrentVersion] = useState(1)
  const [isRunning, setIsRunning] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const canvasRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setNodes(initialNodes)
    setEdges(initialEdges)
    if (initialNodes.length > 0) {
      setVersions([{ id: 'v1', version: 1, nodes: initialNodes, edges: initialEdges, timestamp: new Date() }])
    }
  }, [initialNodes, initialEdges])

  const generateId = useCallback(() => {
    return `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }, [])

  const generateEdgeId = useCallback(() => {
    return `edge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }, [])

  const selectedNode = nodes.find(n => n.id === selectedNodeId)
  const editingNode = nodes.find(n => n.id === editingNodeId)

  const addNode = useCallback((type: NodeType) => {
    const template = NODE_TEMPLATES[type]
    const newNode: PipelineNode = {
      id: generateId(),
      name: template.label,
      type,
      position: { x: 100 + nodes.length * 50, y: 100 + nodes.length * 30 },
      config: { ...template.defaultConfig },
      inputs: [...template.defaultInputs],
      outputs: [...template.defaultOutputs],
      status: 'pending',
    }
    setNodes(prev => [...prev, newNode])
    setShowAddMenu(false)
  }, [nodes.length, generateId])

  const updateNode = useCallback((id: string, updates: Partial<PipelineNode>) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n))
  }, [])

  const deleteNode = useCallback((id: string) => {
    setNodes(prev => prev.filter(n => n.id !== id))
    setEdges(prev => prev.filter(e => e.source !== id && e.target !== id))
    if (selectedNodeId === id) setSelectedNodeId(null)
  }, [selectedNodeId])

  const startConnection = useCallback((nodeId: string) => {
    setConnectingFrom(nodeId)
  }, [])

  const completeConnection = useCallback((targetId: string) => {
    if (connectingFrom && connectingFrom !== targetId) {
      const newEdge: PipelineEdge = {
        id: generateEdgeId(),
        source: connectingFrom,
        target: targetId,
      }
      setEdges(prev => [...prev, newEdge])
    }
    setConnectingFrom(null)
  }, [connectingFrom, generateEdgeId])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect()
      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    }
  }, [])

  const handleSave = useCallback(() => {
    const newVersionNum = currentVersion + 1
    const changes = versions.length > 0 ? computeDiff(versions[versions.length - 1].nodes, nodes) : []
    const newVersion: PipelineVersion = {
      id: `v${newVersionNum}`,
      version: newVersionNum,
      nodes: [...nodes],
      edges: [...edges],
      timestamp: new Date(),
      changes,
    }
    setVersions(prev => [...prev, newVersion])
    setCurrentVersion(newVersionNum)
    if (onSave) onSave(nodes, edges)
  }, [nodes, edges, currentVersion, versions, onSave])

  const loadVersion = useCallback((version: PipelineVersion) => {
    setNodes(version.nodes)
    setEdges(version.edges)
    setCurrentVersion(version.version)
    setShowVersionHistory(false)
  }, [])

  const generatePipeline = useCallback(async () => {
    if (nodes.length === 0) return
    
    setIsGenerating(true)
    try {
      const response = await fetch('/api/pipeline/design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodes: nodes || [],
          edges: edges || [],
          pipeline_name: pipelineName || 'pipeline',
        }),
      })

      console.log('Pipeline design response status:', response.status)
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Response error:', errorText)
        throw new Error(`Generation failed: ${response.status} ${errorText}`)
      }

      const result = await response.json()
      
      if (result.nodes) {
        const newNodes: PipelineNode[] = result.nodes.map((n: any, idx: number) => ({
          id: generateId(),
          name: n.name || `Node ${idx + 1}`,
          type: n.type || 'transform',
          position: { x: 100 + idx * 200, y: 150 + idx * 100 },
          config: n.config || {},
          inputs: n.inputs || [],
          outputs: n.outputs || [],
          status: 'pending' as NodeStatus,
        }))
        setNodes(newNodes)
      }
      
      if (result.edges) {
        const newEdges: PipelineEdge[] = result.edges.map((e: any) => ({
          id: generateEdgeId(),
          source: e.source,
          target: e.target,
        }))
        setEdges(newEdges)
      }
    } catch (err) {
      console.error('Generation error:', err)
      // Show more details about the error
      if (err instanceof Error) {
        console.error('Error message:', err.message)
      }
    } finally {
      setIsGenerating(false)
    }
  }, [nodes, edges, pipelineName, generateId, generateEdgeId])

  const runPipeline = useCallback(async () => {
    setIsRunning(true)
    setNodes(prev => prev.map(n => ({ ...n, status: 'pending' })))
    
    const sortedNodes = topologicalSort(nodes, edges)
    
    for (let i = 0; i < sortedNodes.length; i++) {
      const nodeId = sortedNodes[i]
      setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, status: 'running' } : n))
      
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const success = Math.random() > 0.1
      setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, status: success ? 'completed' : 'failed' } : n))
      
      if (!success) {
        break
      }
    }
    
    setIsRunning(false)
  }, [nodes, edges])

  const stopPipeline = useCallback(() => {
    setIsRunning(false)
    setNodes(prev => prev.map(n => n.status === 'running' ? { ...n, status: 'pending' } : n))
  }, [])

  const loadPipelineTemplate = useCallback((template: PipelineTemplate) => {
    const nodeIdMap = new Map<string, string>()
    const newNodes: PipelineNode[] = template.nodes.map((n, idx) => {
      const id = generateId()
      nodeIdMap.set(String(idx), id)
      return {
        ...n,
        id,
        position: { x: 100 + idx * 180, y: 150 + (idx % 2) * 120 },
        status: 'pending' as NodeStatus,
      }
    })
    
    const newEdges: PipelineEdge[] = template.edges.map(e => ({
      id: generateEdgeId(),
      source: nodeIdMap.get(e.source)!,
      target: nodeIdMap.get(e.target)!,
    }))
    
    setNodes(newNodes)
    setEdges(newEdges)
    setPipelineName(template.name)
    setShowBookTemplates(false)
  }, [generateId, generateEdgeId])

  const exportPipeline = useCallback(() => {
    const pipeline = { name: pipelineName, nodes, edges, version: currentVersion }
    const blob = new Blob([JSON.stringify(pipeline, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${pipelineName.toLowerCase().replace(/\s+/g, '-')}.json`
    a.click()
  }, [nodes, edges, pipelineName, currentVersion])

  const importPipeline = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (ev) => {
          try {
            const data = JSON.parse(ev.target?.result as string)
            setNodes(data.nodes || [])
            setEdges(data.edges || [])
            setPipelineName(data.name || 'Imported Pipeline')
          } catch {
            alert('Invalid pipeline file')
          }
        }
        reader.readAsText(file)
      }
    }
    input.click()
  }, [])

  const resetPipeline = useCallback(() => {
    if (confirm('Reset pipeline?')) {
      setNodes([])
      setEdges([])
      setSelectedNodeId(null)
    }
  }, [])

  const renderConfigField = (field: ConfigField, nodeId: string, currentConfig: Record<string, any>) => {
    const value = currentConfig[field.name]
    
    switch (field.type) {
      case 'text':
        return <input type="text" value={value || ''} onChange={(e) => updateNode(nodeId, { config: { ...currentConfig, [field.name]: e.target.value } })} className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-sm text-white" />;
      case 'number':
        return <input type="number" value={value ?? ''} onChange={(e) => updateNode(nodeId, { config: { ...currentConfig, [field.name]: parseFloat(e.target.value) } })} className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-sm text-white" />;
      case 'select':
        return <select value={value || field.options?.[0]} onChange={(e) => updateNode(nodeId, { config: { ...currentConfig, [field.name]: e.target.value } })} className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-sm text-white">{field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select>;
      case 'boolean':
        return <label className="flex items-center gap-2"><input type="checkbox" checked={value || false} onChange={(e) => updateNode(nodeId, { config: { ...currentConfig, [field.name]: e.target.checked } })} className="w-4 h-4 rounded" /><span className="text-sm text-neutral-400">Enable</span></label>;
      default:
        return null
    }
  }

  const getEdgePath = (sourceNode: PipelineNode, targetNode: PipelineNode) => {
    const sx = sourceNode.position.x + 160
    const sy = sourceNode.position.y + 40
    const tx = targetNode.position.x
    const ty = targetNode.position.y + 40
    const dx = Math.abs(tx - sx)
    
    return `M ${sx} ${sy} C ${sx + dx * 0.5} ${sy}, ${tx - dx * 0.5} ${ty}, ${tx} ${ty}`
  }

  const getStatusColor = (status: NodeStatus | undefined) => {
    switch (status) {
      case 'pending': return 'border-neutral-500'
      case 'running': return 'border-yellow-500 animate-pulse'
      case 'completed': return 'border-green-500'
      case 'failed': return 'border-red-500'
      default: return 'border-neutral-500'
    }
  }

  const getStatusBadge = (status: NodeStatus | undefined) => {
    switch (status) {
      case 'pending': return <Badge className="bg-neutral-600/50 text-neutral-300 text-xs">Pending</Badge>
      case 'running': return <Badge className="bg-yellow-500/50 text-yellow-300 text-xs flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Running</Badge>
      case 'completed': return <Badge className="bg-green-500/50 text-green-300 text-xs">Completed</Badge>
      case 'failed': return <Badge className="bg-red-500/50 text-red-300 text-xs">Failed</Badge>
      default: return null
    }
  }

  return (
    <div className="flex h-full gap-6">
      <div className="flex-1 rounded-2xl border border-neutral-800 bg-neutral-900/50 backdrop-blur-xl p-4 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <input type="text" value={pipelineName} onChange={(e) => setPipelineName(e.target.value)} className="bg-transparent text-white font-bold text-lg border-none focus:outline-none" placeholder="Pipeline Name" />
            <Badge variant="outline" className="border-neutral-600 text-neutral-400">v{currentVersion}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={generatePipeline} disabled={isGenerating} className="border-neutral-700">
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span className="ml-2">Generate</span>
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowVersionHistory(!showVersionHistory)} className="border-neutral-700"><History className="w-4 h-4 mr-2" />History</Button>
            <Button size="sm" variant="outline" onClick={() => setShowBookTemplates(!showBookTemplates)} className="border-neutral-700"><BookTemplate className="w-4 h-4 mr-2" />Templates</Button>
            <Button size="sm" variant="outline" onClick={() => setShowValidation(!showValidation)} className="border-neutral-700"><CheckCircle className="w-4 h-4 mr-2" />Validate</Button>
            <Button size="sm" variant="outline" onClick={importPipeline} className="border-neutral-700"><Save className="w-4 h-4 mr-2" />Import</Button>
            <Button size="sm" variant="outline" onClick={exportPipeline} className="border-neutral-700"><Save className="w-4 h-4 mr-2" />Export</Button>
            <Button size="sm" variant="outline" onClick={() => setShowAddMenu(!showAddMenu)} className="border-neutral-700"><Plus className="w-4 h-4 mr-2" />Add Node</Button>
            <Button size="sm" variant="outline" onClick={resetPipeline} className="border-neutral-700"><RotateCcw className="w-4 h-4 mr-2" />Reset</Button>
            <Button size="sm" onClick={handleSave} className="bg-brand-500"><Save className="w-4 h-4 mr-2" />Save</Button>
            {isRunning ? (
              <Button size="sm" variant="destructive" onClick={stopPipeline}><Pause className="w-4 h-4 mr-2" />Stop</Button>
            ) : (
              <Button size="sm" onClick={runPipeline} disabled={nodes.length === 0} className="bg-green-600"><Play className="w-4 h-4 mr-2" />Run</Button>
            )}
          </div>
        </div>

        {showVersionHistory && versions.length > 0 && (
          <div className="mb-4 p-4 rounded-xl bg-neutral-800/80 border border-neutral-700 max-h-60 overflow-y-auto">
            <h4 className="text-white font-semibold mb-3">Version History</h4>
            <div className="space-y-2">
              {[...versions].reverse().map(v => (
                <div key={v.id} className="flex items-center justify-between p-2 rounded hover:bg-neutral-700/50 cursor-pointer" onClick={() => loadVersion(v)}>
                  <div>
                    <span className="text-white text-sm">v{v.version}</span>
                    <span className="text-neutral-500 text-xs ml-2">{v.timestamp.toLocaleString()}</span>
                  </div>
                  <Badge className="bg-neutral-700 text-neutral-300 text-xs">{v.changes?.length || 0} changes</Badge>
                </div>
              ))}
            </div>
            {versions.length > 1 && versions[versions.length - 1].changes && versions[versions.length - 1].changes!.length > 0 && (
              <div className="mt-4">
                <ApprovalDiffView title="Latest Changes" description={`Version ${currentVersion} changes`} changes={versions[versions.length - 1].changes!} />
              </div>
            )}
          </div>
        )}

        {showBookTemplates && (
          <div className="mb-4 p-4 rounded-xl bg-neutral-800/80 border border-neutral-700">
            <div className="grid grid-cols-3 gap-3">
              {PIPELINE_TEMPLATES.map(template => (
                <button key={template.id} onClick={() => loadPipelineTemplate(template)} className="p-4 rounded-lg bg-neutral-900 border border-neutral-700 hover:border-brand-500 text-left transition-colors">
                  <template.icon className="w-6 h-6 text-brand-400 mb-2" />
                  <p className="text-white font-medium text-sm">{template.name}</p>
                  <p className="text-neutral-500 text-xs mt-1">{template.description}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {showAddMenu && (
          <div className="mb-4 p-4 rounded-xl bg-neutral-800/80 border border-neutral-700">
            <div className="grid grid-cols-4 gap-2">
              {(Object.entries(NODE_TEMPLATES) as [NodeType, NodeBookTemplate][]).map(([type, template]) => (
                <button key={type} onClick={() => addNode(type)} className="p-3 rounded-lg bg-neutral-900 border border-neutral-700 hover:border-brand-500 text-left">
                  <template.icon className="w-5 h-5 text-brand-400 mb-1" />
                  <p className="text-white text-xs">{template.label}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={canvasRef} className="relative flex-1 bg-neutral-950 rounded-xl border border-dashed border-neutral-800 overflow-hidden" onMouseMove={handleMouseMove} onMouseUp={() => setConnectingFrom(null)}>
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {edges.map(edge => {
              const sourceNode = nodes.find(n => n.id === edge.source)
              const targetNode = nodes.find(n => n.id === edge.target)
              if (!sourceNode || !targetNode) return null
              return (
                <path key={edge.id} d={getEdgePath(sourceNode, targetNode)} fill="none" stroke="#525252" strokeWidth="2" className="pointer-events-auto cursor-pointer hover:stroke-neutral-400" onClick={() => setEdges(prev => prev.filter(e => e.id !== edge.id))} />
              )
            })}
            {connectingFrom && (
              <line x1={nodes.find(n => n.id === connectingFrom)?.position.x! + 160} y1={nodes.find(n => n.id === connectingFrom)?.position.y! + 40} x2={mousePos.x} y2={mousePos.y} stroke="#22c55e" strokeWidth="2" strokeDasharray="5,5" />
            )}
          </svg>
          
          {nodes.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Workflow className="w-16 h-16 text-neutral-600 mx-auto mb-4" />
                <p className="text-neutral-500">No nodes in pipeline</p>
                <Button size="sm" onClick={() => addNode('source')} className="bg-brand-500 mt-4"><Plus className="w-4 h-4 mr-2" />Add Node</Button>
              </div>
            </div>
          ) : (
            <div className="p-4">
              {nodes.map((node) => {
                const template = NODE_TEMPLATES[node.type]
                const Icon = template.icon
                const isSelected = selectedNodeId === node.id
                return (
                  <div key={node.id} onClick={() => setSelectedNodeId(node.id)} style={{ left: `${node.position.x}px`, top: `${node.position.y}px` }} className={cn('absolute w-40 rounded-xl border-2 p-3 cursor-move', template.color, getStatusColor(node.status), isSelected ? 'ring-2 ring-white' : '')}>
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-4 h-4" />
                      <div className="font-bold text-sm truncate text-white flex-1">{node.name}</div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      {node.outputs.length > 0 && (
                        <div className="w-3 h-3 bg-green-500 rounded-full cursor-pointer hover:scale-125 transition-transform" onClick={(e) => { e.stopPropagation(); startConnection(node.id) }} title="Drag to connect" />
                      )}
                      {getStatusBadge(node.status)}
                      {node.inputs.length > 0 && (
                        <div className="w-3 h-3 bg-blue-500 rounded-full cursor-pointer hover:scale-125 transition-transform" onClick={(e) => { e.stopPropagation(); completeConnection(node.id) }} title="Drop to connect" />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="w-80 rounded-2xl border border-neutral-800 bg-neutral-900/50 backdrop-blur-xl p-4 overflow-y-auto">
        {editingNodeId && editingNode ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold">Edit Node</h3>
              <button onClick={() => setEditingNodeId(null)}><X className="w-4 h-4 text-neutral-400" /></button>
            </div>
            <div>
              <label className="text-xs text-neutral-400">Name</label>
              <input type="text" value={editingNode.name} onChange={(e) => updateNode(editingNode.id, { name: e.target.value })} className="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700 text-white text-sm" />
            </div>
            <div>
              <label className="text-xs text-neutral-400">Configuration</label>
              <div className="space-y-2 mt-2">
                {NODE_TEMPLATES[editingNode.type].configFields.map(field => (
                  <div key={field.name}>
                    <label className="text-xs text-neutral-500">{field.label}</label>
                    {renderConfigField(field, editingNode.id, editingNode.config)}
                  </div>
                ))}
              </div>
            </div>
            <Button onClick={() => setEditingNodeId(null)} className="w-full bg-brand-500"><Check className="w-4 h-4 mr-2" />Done</Button>
          </div>
        ) : selectedNode ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-white font-bold">{selectedNode.name}</h4>
                <p className="text-xs text-neutral-500">{NODE_TEMPLATES[selectedNode.type].description}</p>
              </div>
              <button onClick={() => setEditingNodeId(selectedNode.id)} className="px-3 py-1 rounded bg-brand-500/20 text-brand-400 text-sm">Edit</button>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-neutral-400">Status:</label>
              {getStatusBadge(selectedNode.status)}
            </div>
            <div className="text-xs text-neutral-500">
              <p>Inputs: {selectedNode.inputs.join(', ') || 'none'}</p>
              <p>Outputs: {selectedNode.outputs.join(', ') || 'none'}</p>
            </div>
            <div className="flex gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full" title="Output port" />
              <span className="text-xs text-neutral-500">Drag to connect</span>
            </div>
            <Button variant="outline" onClick={() => deleteNode(selectedNode.id)} className="w-full border-red-500/50 text-red-400"><Trash2 className="w-4 h-4 mr-2" />Delete</Button>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-center">
            <p className="text-neutral-500 text-sm">Select a node</p>
          </div>
        )}
      </div>
    </div>
  )
}

function topologicalSort(nodes: PipelineNode[], edges: PipelineEdge[]): string[] {
  const inDegree = new Map<string, number>()
  const adjList = new Map<string, string[]>()
  
  nodes.forEach(n => {
    inDegree.set(n.id, 0)
    adjList.set(n.id, [])
  })
  
  edges.forEach(e => {
    if (inDegree.has(e.target)) {
      inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1)
      adjList.get(e.source)?.push(e.target)
    }
  })
  
  const queue: string[] = []
  inDegree.forEach((degree, id) => {
    if (degree === 0) queue.push(id)
  })
  
  const result: string[] = []
  while (queue.length > 0) {
    const curr = queue.shift()!
    result.push(curr)
    adjList.get(curr)?.forEach(neighbor => {
      const newDegree = (inDegree.get(neighbor) || 0) - 1
      inDegree.set(neighbor, newDegree)
      if (newDegree === 0) queue.push(neighbor)
    })
  }
  
  return result
}
