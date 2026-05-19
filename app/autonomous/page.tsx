'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Upload, Sparkles, Cpu, Zap, ArrowRight, Loader2, 
  CheckCircle2, AlertCircle, TrendingUp, DollarSign, 
  Leaf, Clock, Brain, MessageSquare, Sparkle, ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface DataProfile {
  id: string
  name: string
  rows: number
  columns: number
  features: number
  data_type: string
  task_type: string
  vibe_summary: string
  confidence: number
}

interface ModelRec {
  id: string
  name: string
  model_type: string
  score: number
  rationale: string
  estimated_accuracy: number
  estimated_cost: number
  estimated_vram_gb: number
  is_finetunable: boolean
  finetune_method?: string
}

export default function AutonomousPage() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [profile, setProfile] = useState<DataProfile | null>(null)
  const [recommendations, setRecommendations] = useState<ModelRec[]>([])
  const [pipeline, setPipeline] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  // Animation states
  const [animateCards, setAnimateCards] = useState(false)
  const [animateResults, setAnimateResults] = useState(false)

  // Auto animate on mount
  useState(() => {
    setMounted(true)
    setTimeout(() => setAnimateCards(true), 100)
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setError(null)
    }
  }

  const analyzeData = async () => {
    if (!file) return
    
    setAnalyzing(true)
    setError(null)
    setAnimateResults(false)
    
    const formData = new FormData()
    formData.append('file', file)
    formData.append('name', file.name.replace('.csv', ''))
    
    try {
      const res = await fetch('/api/autonomous/analyze', {
        method: 'POST',
        body: formData,
      })
      
      if (!res.ok) throw new Error('Analysis failed')
      
      const data = await res.json()
      setProfile(data.profile)
      setTimeout(() => setAnimateResults(true), 100)
    } catch (err: any) {
      setError(err.message || 'Failed to analyze data')
    } finally {
      setAnalyzing(false)
    }
  }

  const getRecommendations = async () => {
    if (!file) return
    
    setLoading(true)
    setError(null)
    setAnimateResults(false)
    
    const formData = new FormData()
    formData.append('file', file)
    formData.append('name', file.name.replace('.csv', ''))
    formData.append('max_cost', '50')
    formData.append('max_vram', '15')
    
    try {
      const res = await fetch('/api/autonomous/recommend', {
        method: 'POST',
        body: formData,
      })
      
      if (!res.ok) throw new Error('Failed to get recommendations')
      
      const data = await res.json()
      setRecommendations(data.recommendations)
      setProfile(data.data_profile)
      setTimeout(() => setAnimateResults(true), 100)
    } catch (err: any) {
      setError(err.message || 'Failed to get recommendations')
    } finally {
      setLoading(false)
    }
  }

  const runAutonomous = async () => {
    if (!file) return
    
    setLoading(true)
    setError(null)
    setAnimateResults(false)
    
    const formData = new FormData()
    formData.append('file', file)
    formData.append('name', file.name.replace('.csv', ''))
    formData.append('max_cost', '50')
    formData.append('max_vram', '15')
    formData.append('max_latency', '1000')
    
    try {
      const res = await fetch('/api/autonomous/run', {
        method: 'POST',
        body: formData,
      })
      
      if (!res.ok) throw new Error('Pipeline execution failed')
      
      const data = await res.json()
      setPipeline(data.pipeline)
      setProfile(data.pipeline.data_profile)
      setRecommendations(data.pipeline.recommended_models)
      setTimeout(() => setAnimateResults(true), 100)
    } catch (err: any) {
      setError(err.message || 'Failed to run pipeline')
    } finally {
      setLoading(false)
    }
  }

  const getModelTypeColor = (type: string) => {
    switch (type) {
      case 'llm': return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
      case 'transformer': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      default: return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    }
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-500/20 rounded-lg animate-pulse">
              <Cpu className="w-6 h-6 text-orange-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Autonomous ML Platform</h1>
              <p className="text-gray-400">Vibe-powered pipeline generation & intelligent model selection</p>
            </div>
          </div>
        </div>

        {/* Upload Section */}
        <Card className="bg-neutral-900 border-neutral-800 mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-6">
              <div className="flex-1">
                <label className={cn(
                  "flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-300",
                  file ? "border-orange-500 bg-orange-500/5" : "border-neutral-700 hover:border-orange-500 hover:bg-neutral-800"
                )}>
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className={cn(
                      "w-8 h-8 mb-2 transition-colors",
                      file ? "text-orange-400" : "text-gray-400"
                    )} />
                    <p className="text-sm text-gray-400">
                      {file ? file.name : 'Drop CSV file or click to upload'}
                    </p>
                  </div>
                  <input type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
                </label>
              </div>
              
              <div className="flex flex-col gap-2">
                <Button 
                  onClick={analyzeData} 
                  disabled={!file || analyzing}
                  className="bg-orange-600 hover:bg-orange-700 transition-all duration-200"
                >
                  {analyzing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  Analyze Vibe
                </Button>
                <Button 
                  onClick={getRecommendations} 
                  disabled={!file || loading}
                  variant="outline"
                  className="border-neutral-700 hover:bg-neutral-800 transition-all duration-200"
                >
                  Get Recommendations
                </Button>
                <Button 
                  onClick={runAutonomous} 
                  disabled={!file || loading}
                  className="bg-green-600 hover:bg-green-700 transition-all duration-200"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Run Autonomous
                </Button>
              </div>
            </div>
            
            {error && (
              <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span className="text-red-400">{error}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        {profile && (
          <div className={cn(
            "space-y-6 transition-all duration-500",
            animateResults ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}>
            {/* Data Profile */}
            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-orange-400" />
                  Data Vibe Profile
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
                  <div className="p-4 bg-neutral-800 rounded-lg border border-neutral-700 transition-all duration-300 hover:border-orange-500/50">
                    <div className="text-sm text-gray-400 mb-1">Rows</div>
                    <div className="text-2xl font-bold text-white">{profile.rows.toLocaleString()}</div>
                  </div>
                  <div className="p-4 bg-neutral-800 rounded-lg border border-neutral-700 transition-all duration-300 hover:border-orange-500/50">
                    <div className="text-sm text-gray-400 mb-1">Features</div>
                    <div className="text-2xl font-bold text-white">{profile.features}</div>
                  </div>
                  <div className="p-4 bg-neutral-800 rounded-lg border border-neutral-700 transition-all duration-300 hover:border-orange-500/50">
                    <div className="text-sm text-gray-400 mb-1">Data Type</div>
                    <div className="text-xl font-semibold text-white capitalize">{profile.data_type}</div>
                  </div>
                  <div className="p-4 bg-neutral-800 rounded-lg border border-neutral-700 transition-all duration-300 hover:border-orange-500/50">
                    <div className="text-sm text-gray-400 mb-1">Task</div>
                    <div className="text-xl font-semibold text-white capitalize">{profile.task_type}</div>
                  </div>
                </div>
                
                <div className="mt-4 p-4 bg-gradient-to-r from-orange-500/10 via-purple-500/10 to-blue-500/10 rounded-lg border border-neutral-700">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-orange-400" />
                    <span className="text-sm font-medium text-gray-300">Vibe Summary</span>
                  </div>
                  <div className="text-lg text-white mb-2">{profile.vibe_summary}</div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">Confidence:</span>
                    <Progress value={profile.confidence * 100} className="flex-1 h-2" />
                    <span className="text-sm font-medium text-orange-400">{(profile.confidence * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Model Recommendations */}
            {recommendations.length > 0 && (
              <Card className="bg-neutral-900 border-neutral-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-blue-400" />
                    Model Recommendations
                  </CardTitle>
                  <CardDescription className="text-gray-400">AI-selected models based on your data vibe</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recommendations.map((model, idx) => (
                      <div 
                        key={model.id} 
                        className={cn(
                          "p-4 bg-neutral-800 rounded-lg flex items-center justify-between border border-neutral-700 transition-all duration-300 hover:border-neutral-600",
                          idx === 0 ? "ring-2 ring-green-500/50" : ""
                        )}
                        style={{ animationDelay: `${idx * 100}ms` }}
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold",
                            idx === 0 ? "bg-green-500/20 text-green-400" : "bg-neutral-700 text-gray-400"
                          )}>
                            {idx + 1}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-white">{model.name}</span>
                              <Badge className={getModelTypeColor(model.model_type)}>
                                {model.model_type}
                              </Badge>
                              {model.is_finetunable && (
                                <Badge variant="outline" className="text-purple-400 border-purple-400/50">
                                  {model.finetune_method}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-400">{model.rationale}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-6">
                          <div className="text-center">
                            <div className="text-xs text-gray-500">Score</div>
                            <div className="text-lg font-bold text-green-400">{(model.score * 100).toFixed(0)}%</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-gray-500">Accuracy</div>
                            <div className="text-lg font-bold text-white">{(model.estimated_accuracy * 100).toFixed(0)}%</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-gray-500">VRAM</div>
                            <div className="text-lg font-bold text-white">{model.estimated_vram_gb}GB</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Pipeline Steps */}
            {pipeline && pipeline.pipeline_steps && (
              <Card className="bg-neutral-900 border-neutral-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-green-400" />
                    Generated Pipeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 overflow-x-auto pb-4">
                    {pipeline.pipeline_steps.map((step: any, idx: number) => (
                      <div key={idx} className="flex items-center">
                        <div className="flex flex-col items-center">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center border border-green-500/30">
                            <CheckCircle2 className="w-6 h-6 text-green-400" />
                          </div>
                          <div className="mt-3 text-sm font-medium text-white whitespace-nowrap">{step.name}</div>
                          <div className="text-xs text-gray-500 capitalize">{step.type}</div>
                        </div>
                        {idx < pipeline.pipeline_steps.length - 1 && (
                          <ChevronRight className="w-5 h-5 text-gray-600 mx-3 flex-shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {pipeline.estimated_metrics && (
                    <div className="mt-6 grid grid-cols-4 gap-4">
                      <div className="p-3 bg-neutral-800 rounded-lg flex items-center gap-3 border border-neutral-700">
                        <TrendingUp className="w-5 h-5 text-blue-400" />
                        <div>
                          <div className="text-xs text-gray-500">Accuracy</div>
                          <div className="font-bold text-white">{(pipeline.estimated_metrics.accuracy * 100).toFixed(1)}%</div>
                        </div>
                      </div>
                      <div className="p-3 bg-neutral-800 rounded-lg flex items-center gap-3 border border-neutral-700">
                        <DollarSign className="w-5 h-5 text-green-400" />
                        <div>
                          <div className="text-xs text-gray-500">Cost</div>
                          <div className="font-bold text-white">${pipeline.estimated_metrics.cost_usd}</div>
                        </div>
                      </div>
                      <div className="p-3 bg-neutral-800 rounded-lg flex items-center gap-3 border border-neutral-700">
                        <Leaf className="w-5 h-5 text-emerald-400" />
                        <div>
                          <div className="text-xs text-gray-500">Carbon</div>
                          <div className="font-bold text-white">{pipeline.estimated_metrics.carbon_kg?.toFixed(2) || 0}kg</div>
                        </div>
                      </div>
                      <div className="p-3 bg-neutral-800 rounded-lg flex items-center gap-3 border border-neutral-700">
                        <Clock className="w-5 h-5 text-purple-400" />
                        <div>
                          <div className="text-xs text-gray-500">Time</div>
                          <div className="font-bold text-white">{pipeline.estimated_metrics.time_seconds?.toFixed(1) || 0}s</div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Empty State */}
        {!profile && !loading && (
          <Card className="bg-neutral-900 border-neutral-800">
            <CardContent className="p-12 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-orange-500/20 to-purple-500/20 flex items-center justify-center">
                <Cpu className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Autonomous ML Pipeline</h3>
              <p className="text-gray-400 mb-6 max-w-md mx-auto">
                Upload your dataset and let AI analyze its "vibe" to automatically recommend the best models 
                and generate optimized ML pipelines.
              </p>
              <div className="flex justify-center gap-6">
                <div className="text-center p-4">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-orange-500/20 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-orange-400" />
                  </div>
                  <div className="font-medium text-white">Vibe Analysis</div>
                  <div className="text-sm text-gray-500">Detect data patterns</div>
                </div>
                <div className="text-center p-4">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Brain className="w-6 h-6 text-blue-400" />
                  </div>
                  <div className="font-medium text-white">Smart Selection</div>
                  <div className="text-sm text-gray-500">Classical + LLMs</div>
                </div>
                <div className="text-center p-4">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Zap className="w-6 h-6 text-green-400" />
                  </div>
                  <div className="font-medium text-white">Auto Pipeline</div>
                  <div className="text-sm text-gray-500">Generate & execute</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}