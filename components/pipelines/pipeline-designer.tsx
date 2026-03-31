'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trash2, Plus, Save, RotateCcw, Check, X, Settings, Zap, Database, Cpu, HardDrive, Activity, Layers, Workflow, ArrowRight, Play, Pause, AlertTriangle, CheckCircle, Clock, GitBranch, FileCode, BookTemplate, Box, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

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

export interface PipelineNode {
  id: string
  name: string
  type: NodeType
  position: { x: number; y: number }
  config: Record<string, any>
  inputs: string[]
  outputs: string[]
}

export interface PipelineEdge {
  id: string
  source: string
  target: string
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

const PIPELINE_TEMPLATES = [
  { id: 'etl', name: 'ETL Pipeline', description: 'Extract, Transform, Load', icon: Workflow },
  { id: 'ml', name: 'ML Pipeline', description: 'Machine learning workflow', icon: Cpu },
  { id: 'streaming', name: 'Streaming', description: 'Real-time streaming', icon: Activity },
]

export function PipelineDesigner({ initialNodes = [], initialEdges = [], onSave }: PipelineDesignerProps) {
  const [nodes, setNodes] = useState<PipelineNode[]>([])
  const [edges, setEdges] = useState<PipelineEdge[]>([])
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [showBookTemplates, setShowBookTemplates] = useState(false)
  const [showValidation, setShowValidation] = useState(false)
  const [pipelineName, setPipelineName] = useState('My Pipeline')

  useEffect(() => {
    setNodes(initialNodes)
    setEdges(initialEdges)
  }, [initialNodes, initialEdges])

  const generateId = useCallback(() => {
    return `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
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

  const handleSave = useCallback(() => {
    if (onSave) onSave(nodes, edges)
    alert(`Pipeline "${pipelineName}" saved!`)
  }, [nodes, edges, onSave, pipelineName])

  const exportPipeline = useCallback(() => {
    const pipeline = { name: pipelineName, nodes, edges }
    const blob = new Blob([JSON.stringify(pipeline, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${pipelineName.toLowerCase().replace(/\s+/g, '-')}.json`
    a.click()
  }, [nodes, edges, pipelineName])

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

  return (
    <div className="flex h-full gap-6">
      <div className="flex-1 rounded-2xl border border-neutral-800 bg-neutral-900/50 backdrop-blur-xl p-4 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <input type="text" value={pipelineName} onChange={(e) => setPipelineName(e.target.value)} className="bg-transparent text-white font-bold text-lg border-none focus:outline-none" placeholder="Pipeline Name" />
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowBookTemplates(!showBookTemplates)} className="border-neutral-700"><BookTemplate className="w-4 h-4 mr-2" />BookTemplates</Button>
            <Button size="sm" variant="outline" onClick={() => setShowValidation(!showValidation)} className="border-neutral-700"><CheckCircle className="w-4 h-4 mr-2" />Validate</Button>
            <Button size="sm" variant="outline" onClick={importPipeline} className="border-neutral-700"><Save className="w-4 h-4 mr-2" />Import</Button>
            <Button size="sm" variant="outline" onClick={exportPipeline} className="border-neutral-700"><Save className="w-4 h-4 mr-2" />Export</Button>
            <Button size="sm" variant="outline" onClick={() => setShowAddMenu(!showAddMenu)} className="border-neutral-700"><Plus className="w-4 h-4 mr-2" />Add Node</Button>
            <Button size="sm" variant="outline" onClick={resetPipeline} className="border-neutral-700"><RotateCcw className="w-4 h-4 mr-2" />Reset</Button>
            <Button size="sm" onClick={handleSave} className="bg-brand-500"><Save className="w-4 h-4 mr-2" />Save</Button>
          </div>
        </div>

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

        <div className="relative flex-1 bg-neutral-950 rounded-xl border border-dashed border-neutral-800 overflow-auto">
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
                  <div key={node.id} onClick={() => setSelectedNodeId(node.id)} style={{ left: `${node.position.x}px`, top: `${node.position.y}px` }} className={cn('absolute w-40 rounded-xl border-2 p-3 cursor-pointer', template.color, isSelected ? 'ring-2 ring-white' : '')}>
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-4 h-4" />
                      <div className="font-bold text-sm truncate text-white">{node.name}</div>
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
