'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  Upload, FileText, Play, BarChart3, Download, 
  CheckCircle, Loader2, Target, Brain, Zap, Settings,
  TrendingUp, Users, Award, ChevronRight, X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  uploadAutoMLDataset, listAutoMLDatasets, runAutoMLExperiment, 
  listAutoMLExperiments, deployAutoMLModel, generateAutoMLReport,
  AutoMLDataset, AutoMLExperiment
} from '@/lib/api'

const CLASSIFICATION_MODELS = [
  { name: 'Logistic Regression', description: 'Fast, interpretable baseline', icon: '📊' },
  { name: 'Random Forest', description: 'Robust ensemble method', icon: '🌲' },
  { name: 'XGBoost', description: 'High-performance gradient boosting', icon: '🚀' },
  { name: 'SVM', description: 'Great for high-dimensional data', icon: '🎯' },
  { name: 'KNN', description: 'Simple instance-based learning', icon: '👥' },
  { name: 'Decision Tree', description: 'Easy to interpret', icon: '🌳' },
  { name: 'Naive Bayes', description: 'Fast probabilistic classifier', icon: '📈' },
  { name: 'Gradient Boosting', description: 'Sequential ensemble learning', icon: '📉' },
]

const REGRESSION_MODELS = [
  { name: 'Linear Regression', description: 'Simple baseline', icon: '📊' },
  { name: 'Ridge Regression', description: 'L2 regularized regression', icon: '🏔️' },
  { name: 'Lasso Regression', description: 'L1 regularized regression', icon: '🔗' },
  { name: 'Random Forest', description: 'Non-linear ensemble', icon: '🌲' },
  { name: 'XGBoost', description: 'High-performance boosting', icon: '🚀' },
  { name: 'SVR', description: 'Support vector regression', icon: '🎯' },
  { name: 'KNN Regressor', description: 'Instance-based prediction', icon: '👥' },
  { name: 'Decision Tree Regressor', description: 'Tree-based prediction', icon: '🌳' },
]

export default function AutoMLPage() {
  const [activeTab, setActiveTab] = useState('datasets')
  const [datasets, setDatasets] = useState<AutoMLDataset[]>([])
  const [experiments, setExperiments] = useState<AutoMLExperiment[]>([])
  const [selectedDataset, setSelectedDataset] = useState<AutoMLDataset | null>(null)
  const [selectedExperiment, setSelectedExperiment] = useState<AutoMLExperiment | null>(null)
  const [targetColumn, setTargetColumn] = useState('')
  const [taskType, setTaskType] = useState<'classification' | 'regression'>('classification')
  const [selectedModels, setSelectedModels] = useState<string[]>([])
  const [testSize, setTestSize] = useState(0.2)
  const [randomState, setRandomState] = useState(42)
  const [isUploading, setIsUploading] = useState(false)
  const [isTraining, setIsTraining] = useState(false)
  const [trainingStep, setTrainingStep] = useState('')
  const [trainingProgress, setTrainingProgress] = useState(0)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadDatasets()
    loadExperiments()
  }, [])

  const loadDatasets = async () => {
    try {
      const data = await listAutoMLDatasets()
      setDatasets(data.datasets || [])
    } catch (err) {
      console.error('Failed to load datasets:', err)
    }
  }

  const loadExperiments = async () => {
    try {
      const data = await listAutoMLExperiments()
      setExperiments(data.experiments || [])
    } catch (err) {
      console.error('Failed to load experiments:', err)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file')
      return
    }

    setIsUploading(true)
    setError('')
    setSuccess('')

    try {
      const dataset = await uploadAutoMLDataset(file)
      setDatasets(prev => [...prev, dataset])
      setSelectedDataset(dataset)
      if (dataset.target_column) setTargetColumn(dataset.target_column)
      if (dataset.task_type === 'regression') setTaskType('regression')
      else setTaskType('classification')
      setSuccess('Dataset uploaded successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to upload dataset')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleStartTraining = async () => {
    if (!selectedDataset || !targetColumn) {
      setError('Please select a dataset and target column')
      return
    }

    if (selectedModels.length === 0) {
      setError('Please select at least one model')
      return
    }

    setIsTraining(true)
    setTrainingStep('Preparing data...')
    setTrainingProgress(10)
    setError('')
    setSuccess('')

    try {
      setTrainingStep('Preprocessing features...')
      setTrainingProgress(30)
      
      const experiment = await runAutoMLExperiment({
        dataset_id: selectedDataset.dataset_id,
        target_column: targetColumn,
        task_type: taskType,
        models: selectedModels,
        test_size: testSize,
        random_state: randomState
      })
      
      setTrainingStep('Training complete!')
      setTrainingProgress(100)
      
      setTimeout(() => {
        setExperiments(prev => [...prev, experiment])
        setSelectedExperiment(experiment)
        setActiveTab('results')
        setSuccess('Experiment completed successfully!')
      }, 1000)
      
    } catch (err: any) {
      setError(err.message || 'Failed to run experiment. Please try again.')
    } finally {
      setIsTraining(false)
      setTrainingStep('')
      setTrainingProgress(0)
    }
  }

  const handleModelToggle = (modelName: string) => {
    setSelectedModels(prev => 
      prev.includes(modelName) 
        ? prev.filter(m => m !== modelName)
        : [...prev, modelName]
    )
  }

  const handleSelectAll = () => {
    const models = taskType === 'classification' 
      ? CLASSIFICATION_MODELS.map(m => m.name)
      : REGRESSION_MODELS.map(m => m.name)
    setSelectedModels(models)
  }

  const handleDeselectAll = () => {
    setSelectedModels([])
  }

  const handleDeploy = async () => {
    if (!selectedExperiment?.best_model) return
    
    try {
      const result = await deployAutoMLModel(selectedExperiment.best_model.model_name)
      setSuccess(`Model deployed! Endpoint: ${result.endpoint}`)
      setTimeout(() => setSuccess(''), 5000)
    } catch (err: any) {
      setError(err.message || 'Failed to deploy model')
    }
  }

  const handleGenerateReport = async (format: string) => {
    if (!selectedExperiment) return
    
    try {
      const result = await generateAutoMLReport(selectedExperiment.experiment_id, format)
      window.open(result.report_path, '_blank')
      setSuccess('Report generated!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to generate report')
    }
  }

  const models = taskType === 'classification' ? CLASSIFICATION_MODELS : REGRESSION_MODELS

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">AutoML Lab</h1>
              <p className="text-slate-400">Build, train, and deploy ML models in minutes</p>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 flex items-center gap-2">
            <X className="w-5 h-5" />
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            {success}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-800/50 border border-slate-700 p-1">
            <TabsTrigger value="datasets" className="data-[state=active]:bg-purple-600">
              <FileText className="w-4 h-4 mr-2" />
              Datasets
            </TabsTrigger>
            <TabsTrigger value="experiment" className="data-[state=active]:bg-purple-600">
              <Zap className="w-4 h-4 mr-2" />
              Train Models
            </TabsTrigger>
            <TabsTrigger value="results" className="data-[state=active]:bg-purple-600">
              <BarChart3 className="w-4 h-4 mr-2" />
              Results
            </TabsTrigger>
          </TabsList>

          {/* DATASETS TAB */}
          <TabsContent value="datasets" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Upload Card */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Upload className="w-5 h-5 text-purple-400" />
                    Upload Dataset
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Upload a CSV file to start training
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
                      ${isUploading 
                        ? 'border-purple-500 bg-purple-500/10 opacity-50' 
                        : 'border-slate-600 hover:border-purple-500 hover:bg-slate-800/50'}`}
                  >
                    {isUploading ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-10 h-10 text-purple-400 animate-spin" />
                        <p className="text-slate-400">Uploading...</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <Upload className="w-10 h-10 text-slate-500" />
                        <div>
                          <p className="text-white font-medium">Click to upload</p>
                          <p className="text-sm text-slate-500">CSV files up to 100MB</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Stats Card */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Quick Stats</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-700/30 rounded-xl text-center">
                      <p className="text-3xl font-bold text-purple-400">{datasets.length}</p>
                      <p className="text-sm text-slate-400">Datasets</p>
                    </div>
                    <div className="p-4 bg-slate-700/30 rounded-xl text-center">
                      <p className="text-3xl font-bold text-green-400">{experiments.length}</p>
                      <p className="text-sm text-slate-400">Experiments</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Dataset List */}
            {datasets.length > 0 && (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Your Datasets</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {datasets.map((dataset) => (
                      <div
                        key={dataset.dataset_id}
                        onClick={() => {
                          setSelectedDataset(dataset)
                          if (dataset.target_column) setTargetColumn(dataset.target_column)
                          setActiveTab('experiment')
                        }}
                        className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between
                          ${selectedDataset?.dataset_id === dataset.dataset_id 
                            ? 'border-purple-500 bg-purple-500/10' 
                            : 'border-slate-700 hover:border-slate-600 bg-slate-700/30'}`}
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="w-6 h-6 text-purple-400" />
                          <div>
                            <p className="font-medium text-white">{dataset.name}</p>
                            <p className="text-sm text-slate-400">{dataset.rows} rows × {dataset.columns} cols</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="border-purple-500 text-purple-400">
                            {dataset.task_type}
                          </Badge>
                          <ChevronRight className="w-5 h-5 text-slate-500" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* EXPERIMENT TAB */}
          <TabsContent value="experiment" className="space-y-6">
            {!selectedDataset ? (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="py-12 text-center">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-slate-600" />
                  <p className="text-slate-400 mb-4">Please upload or select a dataset first</p>
                  <Button onClick={() => setActiveTab('datasets')} className="bg-purple-600 hover:bg-purple-700">
                    Go to Datasets
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Configuration */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Dataset Settings */}
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Target className="w-5 h-5 text-purple-400" />
                        Dataset Settings
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label className="text-slate-400 mb-2 block">Selected Dataset</Label>
                        <div className="p-3 bg-slate-700/30 rounded-lg flex items-center gap-2">
                          <FileText className="w-5 h-5 text-purple-400" />
                          <span className="text-white">{selectedDataset.name}</span>
                        </div>
                      </div>

                      <div>
                        <Label className="text-slate-400 mb-2 block">Target Column</Label>
                        <Select value={targetColumn} onValueChange={setTargetColumn}>
                          <SelectTrigger className="bg-slate-700 border-slate-600">
                            <SelectValue placeholder="Select target column" />
                          </SelectTrigger>
                          <SelectContent>
                            {(selectedDataset.features || []).map((col: string) => (
                              <SelectItem key={col} value={col}>{col}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-slate-400 mb-2 block">Task Type</Label>
                        <Select value={taskType} onValueChange={(v) => setTaskType(v as 'classification' | 'regression')}>
                          <SelectTrigger className="bg-slate-700 border-slate-600">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="classification">Classification</SelectItem>
                            <SelectItem value="regression">Regression</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-slate-400 mb-2 block">Test Size</Label>
                          <Input 
                            type="number" 
                            value={testSize} 
                            onChange={(e) => setTestSize(parseFloat(e.target.value))}
                            min={0.1} max={0.5} step={0.1}
                            className="bg-slate-700 border-slate-600 text-white"
                          />
                        </div>
                        <div>
                          <Label className="text-slate-400 mb-2 block">Random Seed</Label>
                          <Input 
                            type="number" 
                            value={randomState} 
                            onChange={(e) => setRandomState(parseInt(e.target.value))}
                            className="bg-slate-700 border-slate-600 text-white"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Training Options */}
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Settings className="w-5 h-5 text-purple-400" />
                        Select Models
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2 mb-4">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handleSelectAll}
                          className="border-slate-600 hover:bg-slate-700"
                        >
                          Select All
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handleDeselectAll}
                          className="border-slate-600 hover:bg-slate-700"
                        >
                          Clear
                        </Button>
                      </div>

                      <div className="space-y-2 max-h-[280px] overflow-y-auto">
                        {models.map((model) => (
                          <div
                            key={model.name}
                            onClick={() => handleModelToggle(model.name)}
                            className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between
                              ${selectedModels.includes(model.name)
                                ? 'border-purple-500 bg-purple-500/10' 
                                : 'border-slate-700 bg-slate-700/30 hover:border-slate-600'}`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{model.icon}</span>
                              <div>
                                <p className="font-medium text-white">{model.name}</p>
                                <p className="text-xs text-slate-500">{model.description}</p>
                              </div>
                            </div>
                            <div className={`w-5 h-5 rounded border flex items-center justify-center
                              ${selectedModels.includes(model.name) 
                                ? 'bg-purple-500 border-purple-500' 
                                : 'border-slate-600'}`}>
                              {selectedModels.includes(model.name) && (
                                <CheckCircle className="w-4 h-4 text-white" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 p-3 bg-slate-700/30 rounded-lg text-center">
                        <span className="text-slate-400">{selectedModels.length} model{selectedModels.length !== 1 ? 's' : ''} selected</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Training Progress */}
                {isTraining && (
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="py-6">
                      <div className="flex items-center gap-4 mb-4">
                        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                        <div>
                          <p className="text-white font-medium">{trainingStep}</p>
                          <p className="text-sm text-slate-400">Training your models...</p>
                        </div>
                      </div>
                      <Progress value={trainingProgress} className="bg-slate-700" />
                    </CardContent>
                  </Card>
                )}

                {/* Start Training Button */}
                <Button
                  onClick={handleStartTraining}
                  disabled={!targetColumn || selectedModels.length === 0 || isTraining}
                  className="w-full py-6 text-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50"
                >
                  {isTraining ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Training...
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 mr-2" />
                      Start Training ({selectedModels.length} models)
                    </>
                  )}
                </Button>
              </div>
            )}
          </TabsContent>

          {/* RESULTS TAB */}
          <TabsContent value="results" className="space-y-6">
            {experiments.length === 0 ? (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="py-12 text-center">
                  <BarChart3 className="w-16 h-16 mx-auto mb-4 text-slate-600" />
                  <p className="text-slate-400">No experiments yet. Run an experiment to see results.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Experiment List */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {experiments.map((exp) => (
                    <div
                      key={exp.experiment_id}
                      onClick={() => setSelectedExperiment(exp)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all flex-shrink-0 min-w-[200px]
                        ${selectedExperiment?.experiment_id === exp.experiment_id
                          ? 'border-purple-500 bg-purple-500/10' 
                          : 'border-slate-700 bg-slate-800/50'}`}
                    >
                      <p className="font-medium text-white capitalize">{exp.task_type}</p>
                      <p className="text-sm text-slate-400">{(exp.models_trained || []).length} models</p>
                      <Badge className={`mt-2 ${exp.status === 'completed' ? 'bg-green-600' : 'bg-yellow-600'}`}>
                        {exp.status}
                      </Badge>
                    </div>
                  ))}
                </div>

                {selectedExperiment && (
                  <>
                    {/* Best Model Card */}
                    <Card className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 border-purple-500/30">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                          <Award className="w-6 h-6 text-yellow-400" />
                          Best Model
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div>
                            <h3 className="text-2xl font-bold text-white">{selectedExperiment.best_model?.model_name}</h3>
                            <p className="text-slate-300">{selectedExperiment.best_model?.reason}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <TrendingUp className="w-4 h-4 text-green-400" />
                              <span className="text-green-400 font-medium">
                                Confidence: {((selectedExperiment.best_model?.confidence || 0) * 100).toFixed(0)}%
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={handleDeploy} className="bg-green-600 hover:bg-green-700">
                              <Upload className="w-4 h-4 mr-2" />
                              Deploy
                            </Button>
                            <Button onClick={() => handleGenerateReport('html')} variant="outline" className="border-slate-600">
                              <Download className="w-4 h-4 mr-2" />
                              Report
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Results Grid */}
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Model Comparison */}
                      <Card className="bg-slate-800/50 border-slate-700">
                        <CardHeader>
                          <CardTitle className="text-white flex items-center gap-2">
                            <Users className="w-5 h-5 text-purple-400" />
                            Model Comparison
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {Object.entries(selectedExperiment.results || {}).map(([modelName, metrics]) => (
                              <div key={modelName} className="p-4 bg-slate-700/30 rounded-lg">
                                <div className="flex items-center justify-between mb-3">
                                  <span className="font-medium text-white">{modelName}</span>
                                  {modelName === selectedExperiment.best_model?.model_name && (
                                    <Badge className="bg-purple-600">Best</Badge>
                                  )}
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  {Object.entries(metrics as Record<string, number>).map(([key, value]) => (
                                    <div key={key} className="flex justify-between bg-slate-800/50 p-2 rounded">
                                      <span className="text-slate-400">{key}:</span>
                                      <span className="text-white font-medium">
                                        {typeof value === 'number' ? value.toFixed(4) : value}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Experiment Summary */}
                      <Card className="bg-slate-800/50 border-slate-700">
                        <CardHeader>
                          <CardTitle className="text-white flex items-center gap-2">
                            <FileText className="w-5 h-5 text-purple-400" />
                            Summary
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="flex justify-between p-3 bg-slate-700/30 rounded-lg">
                              <span className="text-slate-400">Dataset ID</span>
                              <span className="text-white">{selectedExperiment.dataset_id}</span>
                            </div>
                            <div className="flex justify-between p-3 bg-slate-700/30 rounded-lg">
                              <span className="text-slate-400">Task Type</span>
                              <span className="text-white capitalize">{selectedExperiment.task_type}</span>
                            </div>
                            <div className="flex justify-between p-3 bg-slate-700/30 rounded-lg">
                              <span className="text-slate-400">Models Trained</span>
                              <span className="text-white">{(selectedExperiment.models_trained || []).length}</span>
                            </div>
                            <div className="flex justify-between p-3 bg-slate-700/30 rounded-lg">
                              <span className="text-slate-400">Status</span>
                              <Badge className="bg-green-600">{selectedExperiment.status}</Badge>
                            </div>
                            <div className="flex justify-between p-3 bg-slate-700/30 rounded-lg">
                              <span className="text-slate-400">Created</span>
                              <span className="text-white">{new Date(selectedExperiment.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}