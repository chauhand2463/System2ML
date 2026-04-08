'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { fetchDesign } from '@/lib/api'
import { DesignRequest } from '@/lib/api'
import { Loader2, CheckCircle, AlertCircle, Zap, Save, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface SavedPipeline {
  id: string
  name: string
  data: DesignRequest
  createdAt: string
}

const STORAGE_KEY = 'system2ml_saved_pipelines'

export default function NewPipelinePage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [savedPipelines, setSavedPipelines] = useState<SavedPipeline[]>([])
  const [showSaved, setShowSaved] = useState(false)
  
  const [formData, setFormData] = useState<DesignRequest>({
    data_profile: { type: 'tabular' },
    objective: 'accuracy',
    constraints: {
      max_cost_usd: 10,
      max_carbon_kg: 1.0,
      max_latency_ms: 200,
      compliance_level: 'regulated',
    },
    deployment: 'batch',
    retraining: 'drift',
    name: '',
  })

  // Load saved pipelines from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        setSavedPipelines(JSON.parse(saved))
      }
    } catch (e) {
      console.error('Error loading saved pipelines:', e)
    }
  }, [])

  // Save to localStorage whenever form data changes (if name is set)
  useEffect(() => {
    if (formData.name) {
      localStorage.setItem('system2ml_pipeline_form', JSON.stringify(formData))
    }
  }, [formData])

  // Load form from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('system2ml_pipeline_form')
      if (saved) {
        setFormData(JSON.parse(saved))
      }
    } catch (e) {
      console.error('Error loading form:', e)
    }
  }, [])

  const savePipeline = () => {
    if (!formData.name) return
    const newPipeline: SavedPipeline = {
      id: `pipeline-${Date.now()}`,
      name: formData.name,
      data: formData,
      createdAt: new Date().toISOString(),
    }
    const updated = [newPipeline, ...savedPipelines].slice(0, 20) // Keep last 20
    setSavedPipelines(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  const loadSavedPipeline = (pipeline: SavedPipeline) => {
    setFormData(pipeline.data)
    setShowSaved(false)
  }

  const deleteSavedPipeline = (id: string) => {
    const updated = savedPipelines.filter(p => p.id !== id)
    setSavedPipelines(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  const clearAllSaved = () => {
    if (confirm('Clear all saved pipelines?')) {
      setSavedPipelines([])
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetchDesign(formData)
      setResult(response)
    } catch (err: any) {
      setError(err.message || 'Failed to design pipeline')
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="p-8 max-w-4xl mx-auto min-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-sm mb-4">
              <Zap className="w-4 h-4" />
              Create New Pipeline
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Design New Pipeline</h1>
            <p className="text-neutral-400">Configure your ML pipeline with constraints</p>
          </div>
          {savedPipelines.length > 0 && (
            <Button variant="outline" onClick={() => setShowSaved(!showSaved)} className="border-neutral-700">
              <Save className="w-4 h-4 mr-2" /> Saved ({savedPipelines.length})
            </Button>
          )}
        </div>

        {/* Saved Pipelines */}
        {showSaved && savedPipelines.length > 0 && (
          <div className="mb-6 p-4 rounded-xl bg-neutral-900/50 border border-neutral-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-medium">Saved Pipelines</h3>
              <button onClick={clearAllSaved} className="text-xs text-neutral-500 hover:text-red-400">
                <Trash2 className="w-3 h-3" /> Clear All
              </button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {savedPipelines.map((pipeline) => (
                <div key={pipeline.id} className="flex items-center justify-between p-3 rounded-lg bg-neutral-800 border border-neutral-700 hover:border-brand-500/30 transition-all">
                  <div className="cursor-pointer flex-1" onClick={() => loadSavedPipeline(pipeline)}>
                    <p className="text-white font-medium">{pipeline.name}</p>
                    <p className="text-neutral-500 text-xs">{pipeline.data.data_profile.type} • {pipeline.data.objective}</p>
                  </div>
                  <button onClick={() => deleteSavedPipeline(pipeline.id)} className="p-2 text-neutral-500 hover:text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Info */}
          <div className="rounded-2xl bg-neutral-900/50 backdrop-blur-xl border border-white/5 p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center">
                <Zap className="w-4 h-4 text-brand-400" />
              </div>
              Basic Information
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Pipeline Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="My ML Pipeline"
                  className="w-full px-4 py-3 rounded-xl bg-neutral-800/50 border border-white/10 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 transition-all"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Data Type
                </label>
                <select
                  value={formData.data_profile.type}
                  onChange={(e) => setFormData({ ...formData, data_profile: { ...formData.data_profile, type: e.target.value as any } })}
                  className="w-full px-4 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="tabular">Tabular</option>
                  <option value="text">Text</option>
                  <option value="image">Image</option>
                  <option value="time-series">Time Series</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Objective
                </label>
                <select
                  value={formData.objective}
                  onChange={(e) => setFormData({ ...formData, objective: e.target.value as any })}
                  className="w-full px-4 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="accuracy">Accuracy</option>
                  <option value="f1">F1 Score</option>
                  <option value="cost">Cost Optimization</option>
                  <option value="speed">Latency</option>
                  <option value="carbon">Carbon Efficiency</option>
                </select>
              </div>
            </div>
          </div>

          {/* Constraints */}
          <div className="rounded-2xl bg-neutral-900/50 backdrop-blur-xl border border-white/5 p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Zap className="w-4 h-4 text-amber-400" />
              </div>
              Constraints
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Max Cost (INR)
                </label>
                <input
                  type="number"
                  value={formData.constraints.max_cost_usd || ''}
                  onChange={(e) => setFormData({ ...formData, constraints: { ...formData.constraints, max_cost_usd: parseFloat(e.target.value) || 0 } })}
                  className="w-full px-4 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Max Carbon (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.constraints.max_carbon_kg || ''}
                  onChange={(e) => setFormData({ ...formData, constraints: { ...formData.constraints, max_carbon_kg: parseFloat(e.target.value) || 0 } })}
                  className="w-full px-4 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Max Latency (ms)
                </label>
                <input
                  type="number"
                  value={formData.constraints.max_latency_ms || ''}
                  onChange={(e) => setFormData({ ...formData, constraints: { ...formData.constraints, max_latency_ms: parseInt(e.target.value) || 0 } })}
                  className="w-full px-4 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Compliance Level
                </label>
                <select
                  value={formData.constraints.compliance_level}
                  onChange={(e) => setFormData({ ...formData, constraints: { ...formData.constraints, compliance_level: e.target.value as any } })}
                  className="w-full px-4 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="low">Low</option>
                  <option value="regulated">Regulated</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
          </div>

          {/* Deployment */}
          <div className="rounded-2xl bg-neutral-900/50 backdrop-blur-xl border border-white/5 p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Zap className="w-4 h-4 text-purple-400" />
              </div>
              Deployment
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Deployment Mode
                </label>
                <select
                  value={formData.deployment}
                  onChange={(e) => setFormData({ ...formData, deployment: e.target.value as any })}
                  className="w-full px-4 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="batch">Batch</option>
                  <option value="realtime">Real-time</option>
                  <option value="edge">Edge</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Retraining Policy
                </label>
                <select
                  value={formData.retraining}
                  onChange={(e) => setFormData({ ...formData, retraining: e.target.value as any })}
                  className="w-full px-4 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="time">Schedule</option>
                  <option value="drift">Drift Detection</option>
                  <option value="none">None</option>
                </select>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3">
            <Button type="button" onClick={savePipeline} disabled={!formData.name} variant="outline" className="flex-1 border-neutral-700">
              <Save className="w-4 h-4 mr-2" /> Save for Later
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-400 hover:to-brand-500 text-white py-4 text-lg font-semibold shadow-lg shadow-brand-500/25"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Zap className="w-5 h-5" />
              )}
              {loading ? 'Designing Pipeline...' : 'Design Pipeline'}
            </Button>
          </div>
        </form>

        {/* Results */}
        {error && (
          <div className="mt-6 p-4 rounded-lg bg-danger-500/10 border border-danger-500/20">
            <div className="flex items-center gap-2 text-danger-500">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {result && (
          <div className="mt-6 space-y-4">
            {result.feasibility?.is_feasible === false ? (
              <div className="p-4 rounded-lg bg-danger-500/10 border border-danger-500/20">
                <div className="flex items-center gap-2 text-danger-500 mb-2">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-bold">Constraints Infeasible</span>
                </div>
                <div className="text-neutral-300 space-y-1">
                  {result.feasibility?.violations?.map((v: string, i: number) => (
                    <p key={i} className="text-sm">- {v}</p>
                  ))}
                </div>
                <div className="mt-3 text-neutral-400 text-sm">
                  <p className="font-medium">Suggestions:</p>
                  {result.feasibility?.suggestions?.map((s: string, i: number) => (
                    <p key={i} className="text-sm">- {s}</p>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-success-500/10 border border-success-500/20">
                <div className="flex items-center gap-2 text-success-500 mb-4">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-bold">Pipeline Designed Successfully!</span>
                </div>
                
                <p className="text-neutral-300 text-sm mb-4">
                  Pipeline ID: <span className="text-white font-mono">{result.pipeline_id}</span>
                </p>

                <div className="space-y-3">
                  <h3 className="font-bold text-white">Top Designs:</h3>
                  {result.designs?.slice(0, 3).map((design: any, i: number) => (
                    <div key={i} className="p-3 rounded bg-neutral-800 border border-neutral-700">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-white">{design.model}</span>
                        <span className="text-sm text-neutral-400">Rank {i + 1}</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-sm">
                        <div>
                          <span className="text-neutral-500">Accuracy</span>
                          <p className="text-white">{(design.estimated_accuracy * 100).toFixed(1)}%</p>
                        </div>
                        <div>
                          <span className="text-neutral-500">Cost</span>
                          <p className="text-white">₹{design.estimated_cost}</p>
                        </div>
                        <div>
                          <span className="text-neutral-500">Carbon</span>
                          <p className="text-white">{design.estimated_carbon}kg</p>
                        </div>
                        <div>
                          <span className="text-neutral-500">Latency</span>
                          <p className="text-white">{design.estimated_latency}ms</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex gap-2">
                  <Link href={`/pipelines/${result.pipeline_id}`}>
                    <Button className="bg-brand-500 hover:bg-brand-600">
                      View Pipeline
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
