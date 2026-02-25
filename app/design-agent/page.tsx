'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { fetchPipelines, validateConstraints, getFeasibilityPolicy, generateCandidates, getEligibilityMatrix } from '@/lib/api'
import { Loader2, Lightbulb, TrendingUp, Zap, Sparkles, ArrowRight, Check, X, ChevronRight, Shield, AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import Link from 'next/link'

export default function DesignAgentPage() {
  const [pipelines, setPipelines] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<'input' | 'validating' | 'feasibility' | 'candidates' | 'complete'>('input')
  const [validationResult, setValidationResult] = useState<any>(null)
  const [feasibilityPolicy, setFeasibilityPolicy] = useState<any>(null)
  const [candidates, setCandidates] = useState<any[]>([])
  const [eligibilityMatrix, setEligibilityMatrix] = useState<any>(null)
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null)
  
  const [formData, setFormData] = useState({
    dataType: 'tabular',
    objective: 'accuracy',
    maxCost: 10,
    maxCarbon: 1.0,
    maxLatency: 200,
    deployment: 'batch',
    compliance: 'standard',
  })

  useEffect(() => {
    async function loadData() {
      try {
        const [pipelinesData, matrix] = await Promise.all([
          fetchPipelines(),
          getEligibilityMatrix()
        ])
        setPipelines(pipelinesData)
        setEligibilityMatrix(matrix)
      } catch (e) {
        console.error('Error loading data:', e)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const handleValidate = async () => {
    setStep('validating')
    
    const request = {
      data_profile: { type: formData.dataType },
      objective: formData.objective,
      constraints: {
        max_cost_usd: formData.maxCost,
        max_carbon_kg: formData.maxCarbon,
        max_latency_ms: formData.maxLatency,
        compliance_level: formData.compliance,
      },
      deployment: formData.deployment,
    }

    try {
      const validation = await validateConstraints(request)
      setValidationResult(validation)
      
      if (validation.is_valid) {
        setStep('feasibility')
        const policy = await getFeasibilityPolicy(request)
        setFeasibilityPolicy(policy)
        
        const result = await generateCandidates(request)
        setCandidates(result.candidates)
        setStep('candidates')
      } else {
        setStep('input')
      }
    } catch (e) {
      console.error('Validation error:', e)
      setStep('input')
    }
  }

  const handleSelectCandidate = (candidate: any) => {
    setSelectedCandidate(candidate)
    setStep('complete')
  }

  const stats = [
    { label: 'Total Pipelines', value: pipelines.length, icon: Zap, color: 'from-brand-500 to-brand-600' },
    { label: 'Model Families', value: eligibilityMatrix?.model_families?.length || 4, icon: Lightbulb, color: 'from-purple-500 to-purple-600' },
    { label: 'Active', value: pipelines.filter(p => p.status === 'active').length, icon: TrendingUp, color: 'from-emerald-500 to-emerald-600' },
  ]

  return (
    <DashboardLayout>
      <div className="p-8 min-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">AI Design Agent</h1>
            <p className="text-neutral-400">Design ML pipelines with constraint validation</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {stats.map((stat, i) => {
            const Icon = stat.icon
            return (
              <div key={i} className="relative overflow-hidden rounded-2xl bg-neutral-900/50 backdrop-blur-xl border border-white/5 p-5">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-neutral-400 text-sm">{stat.label}</p>
                    <p className="text-2xl font-bold text-white">{stat.value}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Main Content - Two Column */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left - Input Form */}
          <div className="space-y-6">
            {/* Progress Steps */}
            <div className="rounded-2xl bg-neutral-900/50 backdrop-blur-xl border border-white/5 p-6">
              <h2 className="text-lg font-bold text-white mb-4">Design Workflow</h2>
              <div className="flex items-center justify-between">
                {['Input', 'Validate', 'Feasibility', 'Generate', 'Complete'].map((s, i) => {
                  const stepNames = ['input', 'validating', 'feasibility', 'candidates', 'complete']
                  const isActive = step === stepNames[i]
                  const isComplete = stepNames.indexOf(step) > i
                  
                  return (
                    <div key={s} className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        isComplete ? 'bg-emerald-500 text-white' : 
                        isActive ? 'bg-brand-500 text-white' : 
                        'bg-neutral-800 text-neutral-500'
                      }`}>
                        {isComplete ? <Check className="w-4 h-4" /> : i + 1}
                      </div>
                      {i < 4 && <div className={`w-8 h-0.5 ${isComplete ? 'bg-emerald-500' : 'bg-neutral-800'}`} />}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Input Form */}
            <div className="rounded-2xl bg-neutral-900/50 backdrop-blur-xl border border-white/5 p-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-brand-400" />
                Pipeline Requirements
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-neutral-400 mb-2">Data Type</label>
                  <select 
                    value={formData.dataType}
                    onChange={(e) => setFormData({ ...formData, dataType: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-neutral-800/50 border border-white/10 text-white"
                  >
                    <option value="tabular">Tabular Data</option>
                    <option value="text">Text/NLP</option>
                    <option value="image">Image/Computer Vision</option>
                    <option value="time-series">Time Series</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-neutral-400 mb-2">Objective</label>
                  <select 
                    value={formData.objective}
                    onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-neutral-800/50 border border-white/10 text-white"
                  >
                    <option value="accuracy">Accuracy</option>
                    <option value="cost">Cost Optimization</option>
                    <option value="speed">Low Latency</option>
                    <option value="carbon">Carbon Efficiency</option>
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-neutral-400 mb-2">Max Cost ($)</label>
                    <input 
                      type="number" 
                      value={formData.maxCost}
                      onChange={(e) => setFormData({ ...formData, maxCost: parseFloat(e.target.value) })}
                      className="w-full px-4 py-3 rounded-xl bg-neutral-800/50 border border-white/10 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-neutral-400 mb-2">Max Carbon (kg)</label>
                    <input 
                      type="number" 
                      step="0.1"
                      value={formData.maxCarbon}
                      onChange={(e) => setFormData({ ...formData, maxCarbon: parseFloat(e.target.value) })}
                      className="w-full px-4 py-3 rounded-xl bg-neutral-800/50 border border-white/10 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-neutral-400 mb-2">Max Latency (ms)</label>
                    <input 
                      type="number" 
                      value={formData.maxLatency}
                      onChange={(e) => setFormData({ ...formData, maxLatency: parseInt(e.target.value) })}
                      className="w-full px-4 py-3 rounded-xl bg-neutral-800/50 border border-white/10 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-neutral-400 mb-2">Deployment</label>
                    <select 
                      value={formData.deployment}
                      onChange={(e) => setFormData({ ...formData, deployment: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-neutral-800/50 border border-white/10 text-white"
                    >
                      <option value="batch">Batch</option>
                      <option value="realtime">Real-time</option>
                      <option value="edge">Edge</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-neutral-400 mb-2">Compliance</label>
                    <select 
                      value={formData.compliance}
                      onChange={(e) => setFormData({ ...formData, compliance: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-neutral-800/50 border border-white/10 text-white"
                    >
                      <option value="none">None</option>
                      <option value="standard">Standard</option>
                      <option value="regulated">Regulated</option>
                      <option value="highly_regulated">Highly Regulated</option>
                    </select>
                  </div>
                </div>

                <Button 
                  onClick={handleValidate}
                  disabled={step === 'validating' || step === 'feasibility'}
                  className="w-full bg-gradient-to-r from-brand-500 to-brand-600 mt-4"
                >
                  {step === 'validating' ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Validating...</>
                  ) : (
                    <><Sparkles className="w-4 h-4 mr-2" /> Generate Pipeline</>
                  )}
                </Button>
              </div>
            </div>

            {/* Validation Results */}
            {validationResult && !validationResult.is_valid && (
              <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-6">
                <h3 className="text-lg font-bold text-red-400 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Constraint Violations
                </h3>
                <div className="space-y-2">
                  {validationResult.violations?.map((v: any, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <X className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                      <span className="text-neutral-300">{v.message}</span>
                    </div>
                  ))}
                </div>
                {validationResult.suggestions?.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-red-500/20">
                    <h4 className="text-sm font-semibold text-neutral-400 mb-2">Suggestions:</h4>
                    {validationResult.suggestions.map((s: any, i: number) => (
                      <div key={i} className="text-sm text-neutral-500 mb-1">
                        • {s.reason} - Try {s.constraint} = {s.suggested_value}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right - Results */}
          <div className="space-y-6">
            {/* Feasibility Policy */}
            {feasibilityPolicy && (
              <div className="rounded-2xl bg-neutral-900/50 backdrop-blur-xl border border-white/5 p-6">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-brand-400" />
                  Feasibility Policy
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-neutral-400 mb-2">Eligible Model Families</h4>
                    <div className="flex flex-wrap gap-2">
                      {feasibilityPolicy.eligible_model_families?.map((f: string) => (
                        <Badge key={f} className="bg-brand-500/20 text-brand-400">{f}</Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-semibold text-neutral-400 mb-2">Hard Constraints</h4>
                    <div className="flex flex-wrap gap-2">
                      {feasibilityPolicy.hard_constraints?.map((c: string) => (
                        <Badge key={c} className="bg-red-500/20 text-red-400">{c}</Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-neutral-400 mb-2">Required Monitors</h4>
                    <div className="flex flex-wrap gap-2">
                      {feasibilityPolicy.required_monitors?.map((m: string) => (
                        <Badge key={m} className="bg-emerald-500/20 text-emerald-400">{m}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Candidates */}
            {candidates.length > 0 && (
              <div className="rounded-2xl bg-neutral-900/50 backdrop-blur-xl border border-white/5 p-6">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-brand-400" />
                  Pipeline Candidates
                  <Badge className="ml-auto bg-brand-500/20 text-brand-400">
                    {candidates.filter(c => !c.violates_constraints?.length).length} feasible
                  </Badge>
                </h2>
                
                <div className="space-y-3">
                  {candidates.map((candidate: any) => {
                    const isFeasible = !candidate.violates_constraints?.length
                    const isSelected = selectedCandidate?.id === candidate.id
                    
                    return (
                      <div 
                        key={candidate.id}
                        className={`p-4 rounded-xl border transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-brand-500/20 border-brand-500' 
                            : isFeasible 
                              ? 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40' 
                              : 'bg-red-500/5 border-red-500/20'
                        }`}
                        onClick={() => handleSelectCandidate(candidate)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-white">{candidate.name}</h4>
                          {isFeasible ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <AlertTriangle className="w-5 h-5 text-red-400" />
                          )}
                        </div>
                        
                        <div className="grid grid-cols-4 gap-2 text-sm">
                          <div>
                            <p className="text-neutral-500">Cost</p>
                            <p className="text-white">${candidate.estimated_cost}</p>
                          </div>
                          <div>
                            <p className="text-neutral-500">Carbon</p>
                            <p className="text-white">{candidate.estimated_carbon}kg</p>
                          </div>
                          <div>
                            <p className="text-neutral-500">Latency</p>
                            <p className="text-white">{candidate.estimated_latency_ms}ms</p>
                          </div>
                          <div>
                            <p className="text-neutral-500">Accuracy</p>
                            <p className="text-white">{(candidate.estimated_accuracy * 100).toFixed(0)}%</p>
                          </div>
                        </div>

                        {!isFeasible && (
                          <div className="mt-2 pt-2 border-t border-red-500/20">
                            {candidate.violates_constraints?.map((v: any, i: number) => (
                              <p key={i} className="text-xs text-red-400">{v.message}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Model Eligibility Matrix */}
            {eligibilityMatrix && (
              <div className="rounded-2xl bg-neutral-900/50 backdrop-blur-xl border border-white/5 p-6">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Info className="w-5 h-5 text-brand-400" />
                  Model Eligibility Matrix
                </h2>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-2 text-neutral-400">Model</th>
                        <th className="text-right py-2 text-neutral-400">Cost Range</th>
                        <th className="text-right py-2 text-neutral-400">GPU</th>
                      </tr>
                    </thead>
                    <tbody>
                      {eligibilityMatrix.model_families?.map((m: any) => (
                        <tr key={m.family} className="border-b border-white/5">
                          <td className="py-2 text-white">{m.name}</td>
                          <td className="text-right text-neutral-400">${m.cost_range[0]} - ${m.cost_range[1]}</td>
                          <td className="text-right">{m.requires_gpu ? '✓' : '✗'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!feasibilityPolicy && !candidates.length && (
              <div className="rounded-2xl bg-neutral-900/30 border border-white/5 p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-neutral-800 flex items-center justify-center mx-auto mb-4">
                  <Lightbulb className="w-8 h-8 text-neutral-600" />
                </div>
                <p className="text-neutral-500">Enter your requirements and click Generate</p>
                <p className="text-neutral-600 text-sm mt-1">The system will validate constraints and generate feasible pipelines</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
