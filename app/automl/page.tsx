'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  Upload, FileText, Play, BarChart3, Download, 
  CheckCircle, XCircle, Loader2, Target, Brain,
  ChevronRight, RefreshCw, Zap, Settings
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select'
import { 
  uploadAutoMLDataset, listAutoMLDatasets, runAutoMLExperiment, 
  getAvailableModels, getAutoMLExperiment, listAutoMLExperiments,
  compareAutoMLModels, deployAutoMLModel, generateAutoMLReport,
  AutoMLDataset, AutoMLExperiment
} from '@/lib/api'

interface ModelResult {
  model_name: string
  metrics: Record<string, number>
}

export default function AutoMLPage() {
  const [activeTab, setActiveTab] = useState('datasets')
  const [datasets, setDatasets] = useState<AutoMLDataset[]>([])
  const [experiments, setExperiments] = useState<AutoMLExperiment[]>([])
  const [selectedDataset, setSelectedDataset] = useState<AutoMLDataset | null>(null)
  const [selectedExperiment, setSelectedExperiment] = useState<AutoMLExperiment | null>(null)
  const [targetColumn, setTargetColumn] = useState('')
  const [taskType, setTaskType] = useState<'classification' | 'regression' | 'clustering'>('classification')
  const [selectedModels, setSelectedModels] = useState<string[]>([])
  const [availableModels, setAvailableModels] = useState<{ classification: string[]; regression: string[] }>({
    classification: [],
    regression: []
  })
  const [isUploading, setIsUploading] = useState(false)
  const [isTraining, setIsTraining] = useState(false)
  const [trainingProgress, setTrainingProgress] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    loadDatasets()
    loadExperiments()
    loadAvailableModels()
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

  const loadAvailableModels = async () => {
    try {
      const data = await getAvailableModels()
      setAvailableModels(data)
    } catch (err) {
      console.error('Failed to load models:', err)
      setAvailableModels({
        classification: ['Logistic Regression', 'Random Forest', 'XGBoost', 'SVM', 'KNN', 'Decision Tree'],
        regression: ['Linear Regression', 'Random Forest', 'XGBoost', 'Ridge', 'Lasso']
      })
    }
  }

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setError('')

    try {
      const dataset = await uploadAutoMLDataset(file)
      setDatasets(prev => [...prev, dataset])
      setSelectedDataset(dataset)
      if (dataset.target_column) setTargetColumn(dataset.target_column)
      if (dataset.task_type) setTaskType(dataset.task_type as any)
    } catch (err: any) {
      setError(err.message || 'Failed to upload dataset')
    } finally {
      setIsUploading(false)
    }
  }

  const handleStartTraining = async () => {
    if (!selectedDataset || !targetColumn || selectedModels.length === 0) {
      setError('Please select dataset, target column, and at least one model')
      return
    }

    setIsTraining(true)
    setTrainingProgress(0)
    setError('')

    try {
      setTrainingProgress(20)
      const experiment = await runAutoMLExperiment({
        dataset_id: selectedDataset.dataset_id,
        target_column: targetColumn,
        task_type: taskType,
        models: selectedModels,
        test_size: 0.2,
        random_state: 42
      })
      setTrainingProgress(100)
      
      setExperiments(prev => [...prev, experiment])
      setSelectedExperiment(experiment)
      setActiveTab('results')
    } catch (err: any) {
      setError(err.message || 'Failed to run experiment')
    } finally {
      setIsTraining(false)
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

  const handleDeploy = async () => {
    if (!selectedExperiment?.best_model) return
    
    try {
      const result = await deployAutoMLModel(selectedExperiment.best_model.model_name)
      alert(`Model deployed! Endpoint: ${result.endpoint}`)
    } catch (err: any) {
      setError(err.message || 'Failed to deploy model')
    }
  }

  const handleGenerateReport = async (format: string) => {
    if (!selectedExperiment) return
    
    try {
      const result = await generateAutoMLReport(selectedExperiment.experiment_id, format)
      window.open(result.report_path, '_blank')
    } catch (err: any) {
      setError(err.message || 'Failed to generate report')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white flex items-center gap-3">
            <Brain className="w-10 h-10 text-purple-400" />
            AutoML Lab
          </h1>
          <p className="text-slate-400 mt-2">
            Upload datasets, train multiple models, compare results, and deploy the best one
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
            {error}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-900/50 border border-slate-800">
            <TabsTrigger value="datasets" className="data-[state=active]:bg-purple-600">
              <FileText className="w-4 h-4 mr-2" />
              Datasets
            </TabsTrigger>
            <TabsTrigger value="experiment" className="data-[state=active]:bg-purple-600">
              <Zap className="w-4 h-4 mr-2" />
              Run Experiment
            </TabsTrigger>
            <TabsTrigger value="results" className="data-[state=active]:bg-purple-600">
              <BarChart3 className="w-4 h-4 mr-2" />
              Results
            </TabsTrigger>
          </TabsList>

          <TabsContent value="datasets" className="space-y-6">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Upload Dataset</CardTitle>
                <CardDescription className="text-slate-400">
                  Upload a CSV file to start your ML experiment
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className={`border-2 border-dashed rounded-lg p-12 text-center transition-all
                    ${isUploading ? 'pointer-events-none opacity-50' : 'cursor-pointer hover:border-slate-600'}
                    border-slate-700`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <Upload className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                  {isUploading ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-slate-400">Uploading...</span>
                    </div>
                  ) : (
                    <p className="text-slate-400">
                      Click to browse and select a CSV file
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {datasets.length > 0 && (
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white">Your Datasets</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {datasets.map((dataset) => (
                      <div
                        key={dataset.dataset_id}
                        onClick={() => {
                          setSelectedDataset(dataset)
                          if (dataset.target_column) setTargetColumn(dataset.target_column)
                          if (dataset.task_type) setTaskType(dataset.task_type as any)
                          setActiveTab('experiment')
                        }}
                        className={`p-4 rounded-lg border cursor-pointer transition-all
                          ${selectedDataset?.dataset_id === dataset.dataset_id 
                            ? 'border-purple-500 bg-purple-500/10' 
                            : 'border-slate-800 bg-slate-800/30 hover:border-slate-700'}`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="w-5 h-5 text-purple-400" />
                          <span className="font-medium text-white truncate">{dataset.name}</span>
                        </div>
                        <div className="text-sm text-slate-400 space-y-1">
                          <p>{dataset.rows} rows × {dataset.columns} columns</p>
                          <Badge variant="outline" className="text-xs">
                            {dataset.task_type}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="experiment" className="space-y-6">
            {!selectedDataset ? (
              <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="py-12 text-center">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-slate-600" />
                  <p className="text-slate-400">Please upload or select a dataset first</p>
                  <Button onClick={() => setActiveTab('datasets')} className="mt-4 bg-purple-600 hover:bg-purple-700">
                    Go to Datasets
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-slate-900/50 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Target className="w-5 h-5 text-purple-400" />
                      Experiment Configuration
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <label className="text-sm text-slate-400 mb-2 block">Dataset</label>
                      <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                        <span className="text-white">{selectedDataset.name}</span>
                        <span className="text-slate-500 ml-2">({selectedDataset.rows} rows)</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm text-slate-400 mb-2 block">Target Column</label>
                      <Select value={targetColumn} onValueChange={setTargetColumn}>
                        <SelectTrigger className="bg-slate-800 border-slate-700">
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
                      <label className="text-sm text-slate-400 mb-2 block">Task Type</label>
                      <Select value={taskType} onValueChange={(v) => setTaskType(v as any)}>
                        <SelectTrigger className="bg-slate-800 border-slate-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="classification">Classification</SelectItem>
                          <SelectItem value="regression">Regression</SelectItem>
                          <SelectItem value="clustering">Clustering</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-slate-900/50 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Settings className="w-5 h-5 text-purple-400" />
                      Select Models
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {(availableModels[taskType as keyof typeof availableModels] || []).map((model) => (
                        <div
                          key={model}
                          onClick={() => handleModelToggle(model)}
                          className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between
                            ${selectedModels.includes(model)
                              ? 'border-purple-500 bg-purple-500/10' 
                              : 'border-slate-700 bg-slate-800/30 hover:border-slate-600'}`}
                        >
                          <span className="text-white">{model}</span>
                          {selectedModels.includes(model) && (
                            <CheckCircle className="w-5 h-5 text-purple-400" />
                          )}
                        </div>
                      ))}
                    </div>

                    {isTraining && (
                      <div className="mt-6 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-400">Training in progress...</span>
                          <span className="text-purple-400">{trainingProgress}%</span>
                        </div>
                        <Progress value={trainingProgress} className="bg-slate-800" />
                      </div>
                    )}

                    <Button
                      onClick={handleStartTraining}
                      disabled={!targetColumn || selectedModels.length === 0 || isTraining}
                      className="w-full mt-6 bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
                    >
                      {isTraining ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Training...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Start Training
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="results" className="space-y-6">
            {experiments.length === 0 ? (
              <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="py-12 text-center">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 text-slate-600" />
                  <p className="text-slate-400">No experiments yet. Run an experiment to see results.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                <div className="flex gap-4">
                  {experiments.map((exp) => (
                    <div
                      key={exp.experiment_id}
                      onClick={() => setSelectedExperiment(exp)}
                      className={`p-4 rounded-lg border cursor-pointer transition-all
                        ${selectedExperiment?.experiment_id === exp.experiment_id
                          ? 'border-purple-500 bg-purple-500/10' 
                          : 'border-slate-800 bg-slate-900/50'}`}
                    >
                      <p className="text-white font-medium">{exp.task_type}</p>
                      <p className="text-sm text-slate-400">{(exp.models_trained || []).length} models</p>
                    </div>
                  ))}
                </div>

                {selectedExperiment && (
                  <>
                    <Card className="bg-slate-900/50 border-slate-800">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-green-400" />
                          Best Model
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-2xl font-bold text-white">{selectedExperiment.best_model.model_name}</h3>
                            <p className="text-slate-400">{selectedExperiment.best_model.reason}</p>
                            <p className="text-sm text-purple-400 mt-2">
                              Confidence: {(selectedExperiment.best_model.confidence * 100).toFixed(0)}%
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={handleDeploy} className="bg-green-600 hover:bg-green-700">
                              Deploy Model
                            </Button>
                            <Button onClick={() => handleGenerateReport('html')} variant="outline" className="border-slate-700">
                              <Download className="w-4 h-4 mr-2" />
                              Report
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card className="bg-slate-900/50 border-slate-800">
                        <CardHeader>
                          <CardTitle className="text-white">Model Comparison</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {Object.entries(selectedExperiment.results || {}).map(([modelName, metrics]) => (
                              <div key={modelName} className="p-4 bg-slate-800/30 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-medium text-white">{modelName}</span>
                                  {modelName === selectedExperiment.best_model.model_name && (
                                    <Badge className="bg-purple-600">Best</Badge>
                                  )}
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  {Object.entries(metrics).map(([key, value]) => (
                                    <div key={key} className="flex justify-between">
                                      <span className="text-slate-400">{key}:</span>
                                      <span className="text-white">{typeof value === 'number' ? value.toFixed(4) : value}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-slate-900/50 border-slate-800">
                        <CardHeader>
                          <CardTitle className="text-white">Experiment Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="flex justify-between p-3 bg-slate-800/30 rounded-lg">
                              <span className="text-slate-400">Dataset</span>
                              <span className="text-white">{selectedExperiment.dataset_id}</span>
                            </div>
                            <div className="flex justify-between p-3 bg-slate-800/30 rounded-lg">
                              <span className="text-slate-400">Task Type</span>
                              <span className="text-white capitalize">{selectedExperiment.task_type}</span>
                            </div>
                            <div className="flex justify-between p-3 bg-slate-800/30 rounded-lg">
                              <span className="text-slate-400">Models Trained</span>
                              <span className="text-white">{(selectedExperiment.models_trained || []).length}</span>
                            </div>
                            <div className="flex justify-between p-3 bg-slate-800/30 rounded-lg">
                              <span className="text-slate-400">Status</span>
                              <Badge className="bg-green-600">{selectedExperiment.status}</Badge>
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