'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Trash2, Plus, Save, RotateCcw, Check, X, ChevronDown, Settings, Zap, Database, Cpu, HardDrive, Activity, BarChart3, Globe, FileText, Image, Layers, Workflow, ArrowRight } from 'lucide-react'
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

interface NodeTemplate {
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

const NODE_TEMPLATES: Record<NodeType, NodeTemplate> = {
  source: {
    label: 'Data Source',
    description: 'Input data from various sources',
    color: 'bg-blue-500/20 border-blue-500',
    icon: Database,
    defaultConfig: { source_type: 'csv', path: '/data/input.csv', format: 'csv', encoding: 'utf-8', has_header: true, delimiter: ',', skip_rows: 0, max_rows: null, sampling_method: 'none', cache: false },
    defaultInputs: [],
    defaultOutputs: ['data'],
    configFields: [
      { name: 'source_type', label: 'Source Type', type: 'select', options: ['csv', 'json', 'parquet', 'api', 'database', 's3', 'bigquery', 'snowflake'], description: 'Where to load data from' },
      { name: 'path', label: 'Path/URL', type: 'text', placeholder: '/data/input.csv or https://api...', description: 'File path or API endpoint' },
      { name: 'format', label: 'Format', type: 'select', options: ['csv', 'json', 'parquet', 'excel', 'avro', 'xml'], description: 'Data format' },
      { name: 'encoding', label: 'Encoding', type: 'select', options: ['utf-8', 'latin1', 'ascii', 'utf-16', 'iso-8859-1'], description: 'File encoding' },
      { name: 'delimiter', label: 'Delimiter', type: 'select', options: [',', ';', '\\t', '|'], description: 'CSV column separator' },
      { name: 'has_header', label: 'Has Header', type: 'boolean', description: 'Does CSV have header row' },
      { name: 'skip_rows', label: 'Skip Rows', type: 'number', placeholder: '0', description: 'Number of rows to skip' },
      { name: 'max_rows', label: 'Max Rows', type: 'number', placeholder: 'null for all', description: 'Limit number of rows' },
      { name: 'sampling_method', label: 'Sampling', type: 'select', options: ['none', 'random', 'stratified', 'sequential'], description: 'How to sample data' },
      { name: 'cache', label: 'Cache Data', type: 'boolean', description: 'Cache loaded data in memory' },
    ]
  },
  
  transform: {
    label: 'Transform',
    description: 'Data transformation operations',
    color: 'bg-purple-500/20 border-purple-500',
    icon: Layers,
    defaultConfig: { operation: 'normalize', columns: ['*'], method: 'standard', handle_missing: 'mean', remove_outliers: false, outlier_threshold: 3 },
    defaultInputs: ['data'],
    defaultOutputs: ['transformed_data'],
    configFields: [
      { name: 'operation', label: 'Operation', type: 'select', options: ['normalize', 'standardize', 'log', 'square_root', 'binning', 'encoding', 'scaling', 'power', 'box_cox'], description: 'Transformation type' },
      { name: 'columns', label: 'Columns', type: 'text', placeholder: 'col1,col2 or * for all', description: 'Columns to transform' },
      { name: 'method', label: 'Method', type: 'select', options: ['standard', 'minmax', 'robust', 'log', 'box_cox', 'yeo_johnson'], description: 'Scaling method' },
      { name: 'handle_missing', label: 'Handle Missing', type: 'select', options: ['mean', 'median', 'mode', 'drop', 'forward_fill', 'backward_fill', 'interpolate'], description: 'How to handle missing values' },
      { name: 'remove_outliers', label: 'Remove Outliers', type: 'boolean', description: 'Remove statistical outliers' },
      { name: 'outlier_threshold', label: 'Outlier Threshold', type: 'number', placeholder: '3', description: 'Z-score threshold for outliers' },
      { name: 'clip_values', label: 'Clip Values', type: 'boolean', description: 'Clip values to min/max range' },
    ]
  },
  
  model: {
    label: 'ML Model',
    description: 'Machine learning algorithms',
    color: 'bg-brand-500/20 border-brand-500',
    icon: Cpu,
    defaultConfig: { model_type: 'random_forest', n_estimators: 100, max_depth: 10, test_size: 0.2, random_state: 42, optimizer: 'adam', batch_size: 32, epochs: 100, early_stopping: true, validation_split: 0.1 },
    defaultInputs: ['data'],
    defaultOutputs: ['predictions', 'model', 'metrics'],
    configFields: [
      { name: 'model_type', label: 'Model Type', type: 'select', options: ['random_forest', 'xgboost', 'lightgbm', 'catboost', 'logistic_regression', 'linear_regression', 'decision_tree', 'svm', 'knn', 'naive_bayes', 'neural_network', 'transformer', 'lstm', 'bert', 'gpt'], description: 'ML algorithm to use' },
      { name: 'n_estimators', label: 'Number of Estimators', type: 'number', placeholder: '100', description: 'Number of trees (for ensemble)' },
      { name: 'max_depth', label: 'Max Depth', type: 'number', placeholder: '10', description: 'Maximum tree depth' },
      { name: 'learning_rate', label: 'Learning Rate', type: 'number', placeholder: '0.1', description: 'Learning rate for training' },
      { name: 'min_samples_split', label: 'Min Samples Split', type: 'number', placeholder: '2', description: 'Min samples to split node' },
      { name: 'min_samples_leaf', label: 'Min Samples Leaf', type: 'number', placeholder: '1', description: 'Min samples in leaf node' },
      { name: 'criterion', label: 'Criterion', type: 'select', options: ['gini', 'entropy', 'log_loss'], description: 'Splitting criterion' },
      { name: 'max_features', label: 'Max Features', type: 'select', options: ['auto', 'sqrt', 'log2', 'none'], description: 'Features to consider' },
      { name: 'test_size', label: 'Test Size', type: 'number', placeholder: '0.2', description: 'Train/test split ratio' },
      { name: 'random_state', label: 'Random State', type: 'number', placeholder: '42', description: 'Random seed for reproducibility' },
      { name: 'optimizer', label: 'Optimizer', type: 'select', options: ['adam', 'sgd', 'rmsprop', 'adamw'], description: 'Optimizer for neural networks' },
      { name: 'batch_size', label: 'Batch Size', type: 'number', placeholder: '32', description: 'Training batch size' },
      { name: 'epochs', label: 'Epochs', type: 'number', placeholder: '100', description: 'Training epochs' },
      { name: 'early_stopping', label: 'Early Stopping', type: 'boolean', description: 'Stop if no improvement' },
      { name: 'validation_split', label: 'Validation Split', type: 'number', placeholder: '0.1', description: 'Validation data ratio' },
      { name: 'class_weight', label: 'Class Weight', type: 'select', options: ['none', 'balanced', 'balanced_subsample'], description: 'Handle imbalanced classes' },
    ]
  },
  
  sink: {
    label: 'Output Sink',
    description: 'Store results',
    color: 'bg-emerald-500/20 border-emerald-500',
    icon: HardDrive,
    defaultConfig: { output_type: 'csv', path: '/data/output.csv', format: 'csv', include_predictions: true, include_confidence: true, include_timestamp: true, compression: 'none', append: false },
    defaultInputs: ['predictions'],
    defaultOutputs: [],
    configFields: [
      { name: 'output_type', label: 'Output Type', type: 'select', options: ['csv', 'json', 'parquet', 'database', 'api', 's3', 'bigquery'], description: 'Where to save results' },
      { name: 'path', label: 'Output Path', type: 'text', placeholder: '/data/output.csv', description: 'Output file path' },
      { name: 'format', label: 'Format', type: 'select', options: ['csv', 'json', 'parquet', 'excel'], description: 'Output format' },
      { name: 'include_predictions', label: 'Include Predictions', type: 'boolean', description: 'Save prediction column' },
      { name: 'include_confidence', label: 'Include Confidence', type: 'boolean', description: 'Save prediction confidence' },
      { name: 'include_timestamp', label: 'Include Timestamp', type: 'boolean', description: 'Add timestamp to output' },
      { name: 'include_features', label: 'Include Features', type: 'boolean', description: 'Save input features' },
      { name: 'compression', label: 'Compression', type: 'select', options: ['none', 'gzip', 'bz2', 'zip'], description: 'Compression method' },
      { name: 'append', label: 'Append Mode', type: 'boolean', description: 'Append to existing file' },
    ]
  },
  
  monitor: {
    label: 'Monitor',
    description: 'Track model performance',
    color: 'bg-amber-500/20 border-amber-500',
    icon: Activity,
    defaultConfig: { metrics: ['accuracy', 'f1', 'precision', 'recall'], threshold: 0.95, alert_on_drift: true, check_frequency: 'daily', notification_channels: ['email'], store_history: true, retention_days: 30 },
    defaultInputs: ['predictions', 'actual'],
    defaultOutputs: ['alerts', 'dashboard'],
    configFields: [
      { name: 'metrics', label: 'Metrics', type: 'json', placeholder: '["accuracy", "f1"]', description: 'Metrics to track' },
      { name: 'threshold', label: 'Threshold', type: 'number', placeholder: '0.95', description: 'Minimum acceptable performance' },
      { name: 'alert_on_drift', label: 'Alert on Drift', type: 'boolean', description: 'Send alerts when data drifts' },
      { name: 'drift_threshold', label: 'Drift Threshold', type: 'number', placeholder: '0.1', description: 'Drift detection threshold' },
      { name: 'check_frequency', label: 'Check Frequency', type: 'select', options: ['realtime', 'hourly', 'daily', 'weekly'], description: 'How often to check' },
      { name: 'notification_channels', label: 'Notifications', type: 'json', placeholder: '["email", "slack"]', description: 'Where to send alerts' },
      { name: 'store_history', label: 'Store History', type: 'boolean', description: 'Keep historical metrics' },
      { name: 'retention_days', label: 'Retention Days', type: 'number', placeholder: '30', description: 'Days to keep history' },
      { name: 'alert_on_threshold', label: 'Alert on Threshold', type: 'boolean', description: 'Alert when metric crosses threshold' },
    ]
  },

  validator: {
    label: 'Validator',
    description: 'Validate data quality',
    color: 'bg-red-500/20 border-red-500 text-red-400',
    icon: Check,
    defaultConfig: { checks: ['null_check', 'range_check', 'type_check'], fail_on_error: false },
    defaultInputs: ['data'],
    defaultOutputs: ['validated_data', 'validation_report'],
    configFields: [
      { name: 'checks', label: 'Validation Checks', type: 'json', placeholder: '["null_check", "range_check"]', description: 'Data quality checks to run' },
      { name: 'fail_on_error', label: 'Fail on Error', type: 'boolean', description: 'Stop pipeline on validation failure' },
      { name: 'threshold', label: 'Pass Threshold', type: 'number', placeholder: '0.95', description: 'Minimum pass rate' },
    ]
  },

  splitter: {
    label: 'Splitter',
    description: 'Split data into branches',
    color: 'bg-cyan-500/20 border-cyan-500 text-cyan-400',
    icon: ArrowRight,
    defaultConfig: { split_type: 'train_test', ratio: 0.8, shuffle: true },
    defaultInputs: ['data'],
    defaultOutputs: ['train_data', 'test_data'],
    configFields: [
      { name: 'split_type', label: 'Split Type', type: 'select', options: ['train_test', 'kfold', 'stratified', 'time_series'], description: 'How to split data' },
      { name: 'ratio', label: 'Split Ratio', type: 'number', placeholder: '0.8', description: 'Train/test ratio' },
      { name: 'shuffle', label: 'Shuffle', type: 'boolean', description: 'Shuffle before splitting' },
      { name: 'n_splits', label: 'Number of Splits', type: 'number', placeholder: '5', description: 'For k-fold cross validation' },
    ]
  },

  merger: {
    label: 'Merger',
    description: 'Combine multiple data sources',
    color: 'bg-orange-500/20 border-orange-500 text-orange-400',
    icon: Layers,
    defaultConfig: { merge_type: 'concat', on_column: 'id', how: 'inner' },
    defaultInputs: ['data1', 'data2'],
    defaultOutputs: ['merged_data'],
    configFields: [
      { name: 'merge_type', label: 'Merge Type', type: 'select', options: ['concat', 'join', 'merge'], description: 'How to combine data' },
      { name: 'on_column', label: 'Join Column', type: 'text', placeholder: 'id', description: 'Column to join on' },
      { name: 'how', label: 'Join Method', type: 'select', options: ['inner', 'left', 'right', 'outer'], description: 'SQL join type' },
    ]
  },

  feature_engineering: {
    label: 'Feature Engineering',
    description: 'Create new features',
    color: 'bg-pink-500/20 border-pink-500 text-pink-400',
    icon: Zap,
    defaultConfig: { operations: ['one_hot', 'polynomial', 'interactions'], max_features: 100 },
    defaultInputs: ['data'],
    defaultOutputs: ['features'],
    configFields: [
      { name: 'operations', label: 'Operations', type: 'json', placeholder: '["one_hot", "polynomial"]', description: 'Feature engineering operations' },
      { name: 'max_features', label: 'Max Features', type: 'number', placeholder: '100', description: 'Maximum number of features' },
      { name: 'categorical_encoding', label: 'Categorical Encoding', type: 'select', options: ['one_hot', 'label', 'target', 'ordinal'], description: 'How to encode categoricals' },
      { name: 'text_features', label: 'Extract Text Features', type: 'boolean', description: 'Extract features from text columns' },
    ]
  },

  preprocessing: {
    label: 'Preprocessing',
    description: 'Clean and prepare data',
    color: 'bg-indigo-500/20 border-indigo-500 text-indigo-400',
    icon: Settings,
    defaultConfig: { steps: ['clean', 'impute', 'encode'], remove_duplicates: true, trim_strings: true },
    defaultInputs: ['raw_data'],
    defaultOutputs: ['clean_data'],
    configFields: [
      { name: 'steps', label: 'Preprocessing Steps', type: 'json', placeholder: '["clean", "impute"]', description: 'Pipeline of steps' },
      { name: 'remove_duplicates', label: 'Remove Duplicates', type: 'boolean', description: 'Drop duplicate rows' },
      { name: 'trim_strings', label: 'Trim Strings', type: 'boolean', description: 'Remove leading/trailing whitespace' },
      { name: 'handle_outliers', label: 'Handle Outliers', type: 'select', options: ['none', 'clip', 'remove', 'transform'], description: 'What to do with outliers' },
      { name: 'imputation_method', label: 'Imputation', type: 'select', options: ['mean', 'median', 'mode', 'knn', 'none'], description: 'How to fill missing values' },
    ]
  }
}

const POSITIONS: Record<NodeType, { x: number; y: number }> = {
  source: { x: 50, y: 100 },
  transform: { x: 250, y: 100 },
  preprocessing: { x: 250, y: 250 },
  feature_engineering: { x: 450, y: 100 },
  model: { x: 450, y: 250 },
  validator: { x: 650, y: 100 },
  splitter: { x: 650, y: 250 },
  merger: { x: 850, y: 100 },
  sink: { x: 850, y: 250 },
  monitor: { x: 850, y: 400 }
}

export function PipelineDesigner({ initialNodes = [], initialEdges = [], onSave }: PipelineDesignerProps) {
  const [nodes, setNodes] = useState<PipelineNode[]>(initialNodes)
  const [edges, setEdges] = useState<PipelineEdge[]>(initialEdges)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const [showAddMenu, setShowAddMenu] = useState(false)

  const selectedNode = nodes.find(n => n.id === selectedNodeId)
  const editingNode = nodes.find(n => n.id === editingNodeId)

  const addNode = useCallback((type: NodeType) => {
    const template = NODE_TEMPLATES[type]
    const id = `node-${Date.now()}`
    const existingCount = nodes.filter(n => n.type === type).length
    
    const newNode: PipelineNode = {
      id,
      name: `${template.label} ${existingCount + 1}`,
      type,
      position: { ...POSITIONS[type], x: POSITIONS[type].x + (existingCount * 50), y: POSITIONS[type].y + (existingCount * 30) },
      config: { ...template.defaultConfig },
      inputs: [...template.defaultInputs],
      outputs: [...template.defaultOutputs]
    }
    
    setNodes(prev => [...prev, newNode])
    setSelectedNodeId(id)
    setShowAddMenu(false)
  }, [nodes])

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
    alert('Pipeline saved successfully!')
  }, [nodes, edges, onSave])

  const resetPipeline = useCallback(() => {
    if (confirm('Reset pipeline? All nodes will be removed.')) {
      setNodes([])
      setEdges([])
      setSelectedNodeId(null)
    }
  }, [])

  const renderConfigField = (field: ConfigField, nodeId: string, currentConfig: Record<string, any>) => {
    const value = currentConfig[field.name]
    
    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => updateNode(nodeId, { config: { ...currentConfig, [field.name]: e.target.value } })}
            placeholder={field.placeholder}
            className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-sm text-white"
          />
        )
      case 'number':
        return (
          <input
            type="number"
            value={value ?? ''}
            onChange={(e) => updateNode(nodeId, { config: { ...currentConfig, [field.name]: parseFloat(e.target.value) } })}
            placeholder={field.placeholder}
            className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-sm text-white"
          />
        )
      case 'select':
        return (
          <select
            value={value || field.options?.[0]}
            onChange={(e) => updateNode(nodeId, { config: { ...currentConfig, [field.name]: e.target.value } })}
            className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-sm text-white"
          >
            {field.options?.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        )
      case 'boolean':
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={value || false}
              onChange={(e) => updateNode(nodeId, { config: { ...currentConfig, [field.name]: e.target.checked } })}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm text-neutral-400">Enable</span>
          </label>
        )
      case 'json':
        return (
          <textarea
            value={typeof value === 'object' ? JSON.stringify(value) : value || ''}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value)
                updateNode(nodeId, { config: { ...currentConfig, [field.name]: parsed } })
              } catch {
                updateNode(nodeId, { config: { ...currentConfig, [field.name]: e.target.value } })
              }
            }}
            placeholder={field.placeholder}
            className="w-full h-20 px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-xs font-mono text-white resize-none"
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="flex h-full gap-6">
      {/* Canvas Area */}
      <div className="flex-1 rounded-2xl border border-neutral-800 bg-neutral-900/50 backdrop-blur-xl p-4 overflow-hidden relative">
        {/* Toolbar */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowAddMenu(!showAddMenu)} className="border-neutral-700 bg-neutral-800/80">
              <Plus className="w-4 h-4 mr-2" /> Add Node
            </Button>
            
            {showAddMenu && (
              <div className="absolute top-12 left-0 bg-neutral-800 border border-neutral-700 rounded-xl p-2 shadow-xl z-20 w-64">
                {(Object.entries(NODE_TEMPLATES) as [NodeType, NodeTemplate][]).map(([type, template]) => (
                  <button key={type} onClick={() => addNode(type)} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-700 text-left">
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", template.color.split(' ')[0])}>
                      <template.icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-white text-sm">{template.label}</div>
                      <div className="text-neutral-500 text-xs">{template.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={resetPipeline} className="border-neutral-700">
              <RotateCcw className="w-4 h-4 mr-2" /> Reset
            </Button>
            <Button size="sm" onClick={handleSave} className="bg-brand-500 hover:bg-brand-600">
              <Save className="w-4 h-4 mr-2" /> Save Pipeline
            </Button>
          </div>
        </div>

        {/* Canvas */}
        <div className="relative w-full h-full bg-neutral-950 rounded-xl border border-dashed border-neutral-800 mt-12 overflow-auto">
          {nodes.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 rounded-2xl bg-neutral-800/50 flex items-center justify-center mx-auto mb-4">
                  <Workflow className="w-10 h-10 text-neutral-600" />
                </div>
                <p className="text-neutral-500 mb-2">No nodes in pipeline</p>
                <p className="text-neutral-600 text-sm mb-4">Click "Add Node" to build your ML pipeline</p>
                <Button size="sm" onClick={() => addNode('source')} className="bg-brand-500 hover:bg-brand-600">
                  <Plus className="w-4 h-4 mr-2" /> Add First Node
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Connections */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {edges.map((edge) => {
                  const source = nodes.find(n => n.id === edge.source)
                  const target = nodes.find(n => n.id === edge.target)
                  if (!source || !target) return null
                  return (
                    <path key={edge.id} d={`M ${source.position.x + 100} ${source.position.y + 40} C ${source.position.x + 150} ${source.position.y + 40}, ${target.position.x - 50} ${target.position.y + 40}, ${target.position.x} ${target.position.y + 40}`} stroke="#6b8ef4" strokeWidth="2" fill="none" className="opacity-50" />
                  )
                })}
              </svg>

              {/* Nodes */}
              {nodes.map((node) => {
                const template = NODE_TEMPLATES[node.type]
                const Icon = template.icon
                const isSelected = selectedNodeId === node.id
                
                return (
                  <div key={node.id} onClick={() => setSelectedNodeId(node.id)} style={{ left: `${node.position.x}px`, top: `${node.position.y}px` }} className={cn('absolute w-44 rounded-xl border-2 p-3 cursor-pointer transition-all hover:scale-105', template.color, isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-neutral-950 shadow-xl' : '')}>
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-4 h-4 text-white" />
                      <div className="font-bold text-sm truncate text-white">{node.name}</div>
                    </div>
                    <div className="text-xs opacity-90 truncate text-white/80">{template.label}</div>
                  </div>
                )
              })}
            </>
          )}
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-96 rounded-2xl border border-neutral-800 bg-neutral-900/50 backdrop-blur-xl p-6 flex flex-col overflow-y-auto">
        <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
          <Settings className="w-4 h-4" /> Properties
        </h3>

        {editingNode ? (
          <div className="flex-1 space-y-4 overflow-y-auto">
            <div className="flex items-center justify-between">
              <h4 className="text-white font-medium">Edit {NODE_TEMPLATES[editingNode.type].label}</h4>
              <button onClick={() => setEditingNodeId(null)}><X className="w-4 h-4 text-neutral-400 hover:text-white" /></button>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-2">Node Name</label>
              <input type="text" value={editingNode.name} onChange={(e) => updateNode(editingNode.id, { name: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-sm text-white" />
            </div>

            <div className="p-3 rounded-lg bg-neutral-800/50">
              <p className="text-xs text-neutral-400 mb-1">Type</p>
              <p className="text-sm text-white">{NODE_TEMPLATES[editingNode.type].label}</p>
            </div>

            <div className="border-t border-neutral-700 pt-4">
              <h5 className="text-xs font-semibold text-neutral-400 mb-3 uppercase">Configuration</h5>
              <div className="space-y-4">
                {NODE_TEMPLATES[editingNode.type].configFields.map((field) => (
                  <div key={field.name}>
                    <label className="block text-xs font-medium text-neutral-400 mb-1.5">{field.label}</label>
                    {renderConfigField(field, editingNode.id, editingNode.config)}
                    {field.description && <p className="text-xs text-neutral-600 mt-1">{field.description}</p>}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-neutral-700 pt-4">
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">Inputs</label>
                <div className="space-y-1">
                  {editingNode.inputs.map((input, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <input type="text" value={input} onChange={(e) => { const newInputs = [...editingNode.inputs]; newInputs[i] = e.target.value; updateNode(editingNode.id, { inputs: newInputs }) }} className="flex-1 px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-xs text-white" />
                      <button onClick={() => updateNode(editingNode.id, { inputs: editingNode.inputs.filter((_, idx) => idx !== i) })}><X className="w-3 h-3 text-neutral-500" /></button>
                    </div>
                  ))}
                  <button onClick={() => updateNode(editingNode.id, { inputs: [...editingNode.inputs, 'input'] })} className="text-xs text-brand-400">+ Add</button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">Outputs</label>
                <div className="space-y-1">
                  {editingNode.outputs.map((output, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <input type="text" value={output} onChange={(e) => { const newOutputs = [...editingNode.outputs]; newOutputs[i] = e.target.value; updateNode(editingNode.id, { outputs: newOutputs }) }} className="flex-1 px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-xs text-white" />
                      <button onClick={() => updateNode(editingNode.id, { outputs: editingNode.outputs.filter((_, idx) => idx !== i) })}><X className="w-3 h-3 text-neutral-500" /></button>
                    </div>
                  ))}
                  <button onClick={() => updateNode(editingNode.id, { outputs: [...editingNode.outputs, 'output'] })} className="text-xs text-brand-400">+ Add</button>
                </div>
              </div>
            </div>

            <Button onClick={() => setEditingNodeId(null)} className="w-full bg-brand-500 hover:bg-brand-600"><Check className="w-4 h-4 mr-2" /> Done</Button>
          </div>
        ) : selectedNode ? (
          <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-white font-bold">{selectedNode.name}</h4>
                <p className="text-xs text-neutral-500">{NODE_TEMPLATES[selectedNode.type].description}</p>
              </div>
              <button onClick={() => setEditingNodeId(selectedNode.id)} className="px-3 py-1 rounded-lg bg-brand-500/20 text-brand-400 text-sm hover:bg-brand-500/30">Edit</button>
            </div>

            <div className="p-3 rounded-lg bg-neutral-800/50 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-neutral-400">Type</span><span className="text-white">{NODE_TEMPLATES[selectedNode.type].label}</span></div>
              <div className="flex justify-between text-sm"><span className="text-neutral-400">Position</span><span className="text-white">X: {selectedNode.position.x}, Y: {selectedNode.position.y}</span></div>
            </div>

            <div>
              <p className="text-xs font-medium text-neutral-400 mb-2">Configuration</p>
              <div className="p-3 rounded-lg bg-neutral-800/50 text-xs font-mono text-neutral-300 max-h-40 overflow-y-auto">{JSON.stringify(selectedNode.config, null, 2)}</div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-medium text-neutral-400 mb-2">Inputs</p>
                <div className="space-y-1">{selectedNode.inputs.map((inp, i) => (<div key={i} className="px-2 py-1 rounded bg-blue-500/10 text-blue-400 text-xs">{inp}</div>))}</div>
              </div>
              <div>
                <p className="text-xs font-medium text-neutral-400 mb-2">Outputs</p>
                <div className="space-y-1">{selectedNode.outputs.map((out, i) => (<div key={i} className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 text-xs">{out}</div>))}</div>
              </div>
            </div>

            <div className="flex-1" />
            <Button variant="outline" onClick={() => deleteNode(selectedNode.id)} className="w-full border-red-500/50 text-red-400 hover:bg-red-500/10"><Trash2 className="w-4 h-4 mr-2" /> Delete Node</Button>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-center">
            <div>
              <div className="w-16 h-16 rounded-2xl bg-neutral-800/50 flex items-center justify-center mx-auto mb-4"><Plus className="w-8 h-8 text-neutral-600" /></div>
              <p className="text-neutral-500 text-sm">Select or add a node</p>
              <p className="text-neutral-600 text-xs mt-1">10 node types available</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
