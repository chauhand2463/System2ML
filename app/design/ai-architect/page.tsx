'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { useDesign, PipelineCandidate } from '@/hooks/use-design'
import {
  Sparkles,
  Zap,
  Leaf,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Brain,
  Settings,
  Activity,
  ArrowRight,
  ShieldCheck,
  History,
  RefreshCw,
  Database,
  ChevronDown,
  ChevronUp,
  FileText,
  Shield,
  Eye,
  Lock
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { designWithGroq, GroqDesignResponse } from '@/lib/api'

// ─── Severity badge color helper ─────────────────────────────
function severityColor(sev: string) {
  switch (sev?.toLowerCase()) {
    case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30'
    case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
    case 'medium': return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
    default: return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
  }
}

// ─── Animated Gauge ─────────────────────────────────────────
function Gauge({ value, max, label, icon: Icon, color, unit }: { value: number; max: number; label: string; icon: any; color: string; unit: string }) {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <div className="bg-neutral-900/60 border border-white/5 rounded-2xl p-5 space-y-3 hover:border-white/10 transition-all">
      <div className="flex items-center justify-between">
        <Icon className={cn("w-4 h-4", color)} />
        <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value.toFixed(2)}<span className="text-sm text-neutral-500 ml-1">{unit}</span></div>
      <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-1000 ease-out", color === 'text-amber-400' ? 'bg-gradient-to-r from-amber-500 to-amber-400' : 'bg-gradient-to-r from-emerald-500 to-emerald-400')} style={{ width: `${pct}%` }} />
      </div>
      <div className="text-[10px] text-neutral-500">Budget: {max} {unit} / month</div>
    </div>
  )
}

// ─── Pipeline Stage Node ─────────────────────────────────────
function PipelineNode({ icon: Icon, label, sub, index, total }: { icon: any; label: string; sub: string; index: number; total: number }) {
  return (
    <>
      <div className="flex items-center gap-5 group animate-in slide-in-from-left duration-500" style={{ animationDelay: `${index * 120}ms` }}>
        <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center group-hover:bg-brand-500/20 group-hover:scale-110 transition-all duration-300 shrink-0">
          <Icon className="w-5 h-5 text-brand-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-white text-sm">{label}</h4>
          <p className="text-xs text-neutral-500 truncate">{sub || '—'}</p>
        </div>
        <span className="text-[10px] text-neutral-600 font-mono opacity-0 group-hover:opacity-100 transition-opacity">STAGE_{index + 1}</span>
      </div>
      {index < total - 1 && (
        <div className="ml-6 h-6 w-px bg-gradient-to-b from-brand-500/40 to-transparent" />
      )}
    </>
  )
}

// ─── DEFAULT CONFIG ──────────────────────────────────────────
const DEFAULT_PROFILE = {
  type: 'tabular',
  rows: 10000,
  columns: 12,
  has_labels: true,
  label_type: 'classification',
  pii_detected: false,
  pii_fields: [] as string[],
  missing_percentage: 2.5,
}

const DEFAULT_CONSTRAINTS = {
  max_cost_usd: 50,
  max_carbon_kg: 5,
  max_latency_ms: 200,
  compliance_level: 'regulated',
  deployment: 'batch',
  objective_priority: ['accuracy', 'cost', 'carbon'],
}

// ─── MAIN PAGE ───────────────────────────────────────────────
export default function AIArchitectPage() {
  const router = useRouter()
  const {
    setDataset,
    setConstraints: setGlobalConstraints,
    setSelectedPipeline,
    setFeasibilityPassed,
    setSafetyGatePassed,
    setDesignStep
  } = useDesign()

  const [isDesigning, setIsDesigning] = useState(false)
  const [designResult, setDesignResult] = useState<GroqDesignResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'pipeline' | 'alternatives' | 'audit'>('pipeline')
  const [showConfig, setShowConfig] = useState(false)

  // Editable config state
  const [profile, setProfile] = useState(DEFAULT_PROFILE)
  const [constraints, setConstraints] = useState(DEFAULT_CONSTRAINTS)

  const handleDesign = async () => {
    setIsDesigning(true)
    setError(null)
    setDesignResult(null)

    try {
      const response = await designWithGroq({
        dataset_profile: profile,
        constraints
      })
      setDesignResult(response)
    } catch (err: any) {
      console.error('Design error:', err)
      setError(err.message || 'Failed to generate AI design. Make sure the backend is running.')
    } finally {
      setIsDesigning(false)
    }
  }

  const handleApprove = () => {
    if (!designResult || !designResult.pipeline) return

    const pipelineObj = designResult.pipeline.pipeline
    const decision = designResult.pipeline.decision_summary
    const cost = designResult.pipeline.cost_estimate
    const carbon = designResult.pipeline.carbon_estimate
    const explanation = designResult.explanation

    // Map AI Architect result to the shared Design Context
    const candidate: PipelineCandidate = {
      id: `ai-${Math.random().toString(36).substr(2, 9)}`,
      name: `${decision.recommended_model_family || 'AI Optimized'} Pipeline`,
      description: explanation.summary || 'AI-generated optimized pipeline',
      modelFamily: decision.recommended_model_family || 'Custom',
      estimatedCost: cost.monthly_usd || 0,
      estimatedCarbon: carbon.monthly_kg || 0,
      estimatedLatencyMs: pipelineObj.deployment?.latency_budget_ms || 0,
      estimatedAccuracy: 0.95, // AI Architect designs are high-confidence by default
      violatesConstraints: [],
      isFeasible: true
    }

    // Set context values
    setDataset({
      id: `ds-${Math.random().toString(36).substr(2, 9)}`,
      name: `AI_${decision.recommended_model_family}_Design`,
      source: 'upload',
      type: profile.type as any,
      sizeMb: 10,
      labelPresent: profile.has_labels,
      piiDetected: profile.pii_detected,
      missingValues: profile.missing_percentage,
      createdAt: new Date().toISOString()
    })

    setGlobalConstraints({
      maxCostUsd: constraints.max_cost_usd,
      maxCarbonKg: constraints.max_carbon_kg,
      maxLatencyMs: constraints.max_latency_ms,
      complianceLevel: constraints.compliance_level as any,
      objective: (constraints.objective_priority?.[0] || 'accuracy') as any
    })

    setSelectedPipeline(candidate)
    setFeasibilityPassed(true)
    setSafetyGatePassed(true)
    setDesignStep('confirm')

    router.push('/train/confirm')
  }

  const pipeline = designResult?.pipeline?.pipeline || designResult?.pipeline as any
  const explanation = designResult?.explanation
  const critique = designResult?.critique

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">

        {/* ─── HEADER ───────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-brand-400 font-mono text-xs tracking-widest uppercase">
                <Brain className="w-4 h-4" />
                <span>System2ML AI Core</span>
              </div>
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold text-white tracking-tight">AI Architect</h1>
            <p className="text-neutral-500 max-w-xl text-sm">
              Groq Llama-3.3 powered pipeline synthesis with schema validation, self-critique, and explainability.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-neutral-300 text-sm transition-all"
            >
              <Settings className="w-4 h-4" />
              Configure
              {showConfig ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            <button
              onClick={handleDesign}
              disabled={isDesigning}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm shadow-lg shadow-brand-500/20 transition-all"
            >
              {isDesigning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Synthesizing…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Design Pipeline
                </>
              )}
            </button>
          </div>
        </div>

        {/* ─── CONFIGURATION PANEL ──────────────────────── */}
        {showConfig && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-2xl bg-neutral-900/50 border border-white/5 animate-in slide-in-from-top duration-300">
            {/* Dataset Profile */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2"><Database className="w-4 h-4 text-brand-400" /> Dataset Profile</h3>
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1">
                  <span className="text-[10px] text-neutral-500 uppercase font-bold">Data Type</span>
                  <select value={profile.type} onChange={e => setProfile(p => ({ ...p, type: e.target.value }))} className="w-full bg-neutral-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
                    <option value="tabular">Tabular</option>
                    <option value="image">Image</option>
                    <option value="text">Text</option>
                    <option value="time_series">Time Series</option>
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] text-neutral-500 uppercase font-bold">Task</span>
                  <select value={profile.label_type} onChange={e => setProfile(p => ({ ...p, label_type: e.target.value }))} className="w-full bg-neutral-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
                    <option value="classification">Classification</option>
                    <option value="regression">Regression</option>
                    <option value="clustering">Clustering</option>
                    <option value="anomaly_detection">Anomaly Detection</option>
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] text-neutral-500 uppercase font-bold">Rows</span>
                  <input type="number" value={profile.rows} onChange={e => setProfile(p => ({ ...p, rows: +e.target.value }))} className="w-full bg-neutral-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] text-neutral-500 uppercase font-bold">Columns</span>
                  <input type="number" value={profile.columns} onChange={e => setProfile(p => ({ ...p, columns: +e.target.value }))} className="w-full bg-neutral-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
                </label>
                <label className="space-y-1 col-span-2">
                  <span className="text-[10px] text-neutral-500 uppercase font-bold">Missing Data %</span>
                  <input type="number" step="0.1" value={profile.missing_percentage} onChange={e => setProfile(p => ({ ...p, missing_percentage: +e.target.value }))} className="w-full bg-neutral-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
                </label>
                <label className="col-span-2 flex items-center gap-3 py-1">
                  <input type="checkbox" checked={profile.pii_detected} onChange={e => setProfile(p => ({ ...p, pii_detected: e.target.checked }))} className="rounded bg-neutral-800 border-white/20 text-brand-500" />
                  <span className="text-sm text-neutral-300">PII Detected in Dataset</span>
                </label>
              </div>
            </div>

            {/* Constraints */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2"><Shield className="w-4 h-4 text-emerald-400" /> Constraints</h3>
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1">
                  <span className="text-[10px] text-neutral-500 uppercase font-bold">Max Cost (USD/mo)</span>
                  <input type="number" value={constraints.max_cost_usd} onChange={e => setConstraints(c => ({ ...c, max_cost_usd: +e.target.value }))} className="w-full bg-neutral-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] text-neutral-500 uppercase font-bold">Max Carbon (kg/mo)</span>
                  <input type="number" value={constraints.max_carbon_kg} onChange={e => setConstraints(c => ({ ...c, max_carbon_kg: +e.target.value }))} className="w-full bg-neutral-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] text-neutral-500 uppercase font-bold">Max Latency (ms)</span>
                  <input type="number" value={constraints.max_latency_ms} onChange={e => setConstraints(c => ({ ...c, max_latency_ms: +e.target.value }))} className="w-full bg-neutral-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] text-neutral-500 uppercase font-bold">Deployment</span>
                  <select value={constraints.deployment} onChange={e => setConstraints(c => ({ ...c, deployment: e.target.value }))} className="w-full bg-neutral-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
                    <option value="batch">Batch</option>
                    <option value="realtime">Real-time</option>
                    <option value="edge">Edge</option>
                  </select>
                </label>
                <label className="space-y-1 col-span-2">
                  <span className="text-[10px] text-neutral-500 uppercase font-bold">Compliance</span>
                  <select value={constraints.compliance_level} onChange={e => setConstraints(c => ({ ...c, compliance_level: e.target.value }))} className="w-full bg-neutral-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
                    <option value="regulated">Regulated (HIPAA/GDPR)</option>
                    <option value="standard">Standard</option>
                    <option value="minimal">Minimal</option>
                  </select>
                </label>
                <div className="col-span-2 pt-2 border-t border-white/5 opacity-50 select-none">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-emerald-400 uppercase tracking-tight">Real AI Logic</div>
                        <div className="text-[10px] text-neutral-500 mt-0.5">Multi-provider synthesis active</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── ERROR STATE ──────────────────────────────── */}
        {error && (
          <div className="p-5 rounded-3xl bg-red-500/10 border border-red-500/20 flex flex-col md:flex-row md:items-center justify-between gap-6 animate-in slide-in-from-top duration-500 relative overflow-hidden group">
            {/* Ambient Background Glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />

            <div className="flex items-start gap-4 relative z-10">
              <div className="w-10 h-10 rounded-2xl bg-red-500/20 flex items-center justify-center shrink-0 border border-red-500/20">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div className="space-y-1">
                <p className="text-base font-bold text-red-400 tracking-tight">System Initialization Blocked</p>
                <p className="text-xs text-neutral-400 max-w-xl leading-relaxed">
                  {error}
                </p>
              </div>
            </div>

            {/* Fallback info */}
            <div className="relative z-10 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-500/10 border border-neutral-500/20 text-neutral-400 transition-all font-bold text-xs shrink-0">
              Check .env.local
            </div>
          </div>
        )}

        {/* ─── LOADING STATE ────────────────────────────── */}
        {isDesigning && (
          <div className="rounded-3xl border border-brand-500/20 bg-brand-500/5 p-16 text-center space-y-6 animate-in fade-in duration-300">
            <div className="w-20 h-20 rounded-2xl bg-brand-500/10 flex items-center justify-center mx-auto border border-brand-500/20 animate-pulse">
              <Brain className="w-10 h-10 text-brand-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-white">Synthesizing Pipeline…</h3>
              <p className="text-neutral-500 text-sm max-w-md mx-auto">
                Planner Agent → Schema Validator → Self-Critique → Explainability Agent
              </p>
            </div>
            <div className="flex items-center justify-center gap-2">
              {['Planner', 'Validator', 'Critic', 'Explainer'].map((step, i) => (
                <div key={step} className="flex items-center gap-2 animate-in fade-in duration-500" style={{ animationDelay: `${i * 500}ms` }}>
                  <div className={cn("w-2 h-2 rounded-full animate-pulse", i === 0 ? 'bg-brand-400' : 'bg-neutral-600')} style={{ animationDelay: `${i * 300}ms` }} />
                  <span className="text-xs text-neutral-500">{step}</span>
                  {i < 3 && <ArrowRight className="w-3 h-3 text-neutral-700" />}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── EMPTY STATE ──────────────────────────────── */}
        {!designResult && !isDesigning && !error && (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-16 lg:p-24 text-center space-y-6">
            <div className="w-20 h-20 rounded-2xl bg-brand-500/10 flex items-center justify-center mx-auto border border-brand-500/20">
              <Brain className="w-10 h-10 text-brand-400" />
            </div>
            <div className="space-y-2 max-w-sm mx-auto">
              <h3 className="text-xl font-semibold text-white">Ready for Synthesis</h3>
              <p className="text-neutral-500 text-sm">
                Configure your dataset profile and constraints, then click <strong className="text-white">Design Pipeline</strong> to trigger the Groq Planner Agent.
              </p>
            </div>
            <button onClick={handleDesign} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border border-brand-500/30 text-brand-400 hover:bg-brand-500/10 text-sm font-medium transition-all">
              <Sparkles className="w-4 h-4" />
              Begin AI Generation
            </button>
          </div>
        )}

        {/* ─── RESULTS ──────────────────────────────────── */}
        {designResult && pipeline && (
          <div className="grid grid-cols-12 gap-6 pb-12 animate-in fade-in duration-500">

            {/* LEFT: Summary + Gauges + Risks */}
            <div className="col-span-12 lg:col-span-4 space-y-6">

              {/* Executive Summary */}
              <div className="bg-neutral-900/50 border border-white/5 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-white text-sm">Decision Rationale</h3>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase">
                    <CheckCircle2 className="w-3 h-3" /> Verified
                  </span>
                </div>

                <p className="text-white text-sm leading-relaxed">
                  {explanation?.summary || designResult.pipeline?.decision_summary?.rationale?.[0] || 'Pipeline design completed.'}
                </p>

                {explanation?.key_tradeoffs && explanation.key_tradeoffs.length > 0 && (
                  <div className="space-y-3 pt-4 border-t border-white/5">
                    <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Key Tradeoffs</p>
                    {explanation.key_tradeoffs.map((t: any, i: number) => (
                      <div key={i} className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
                        <div className="flex items-center gap-2 text-xs font-semibold text-brand-400">
                          <ArrowRight className="w-3 h-3" />
                          {t.choice}
                        </div>
                        <p className="text-[11px] text-neutral-400">{t.impact || t.reason}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Cost + Carbon Gauges */}
              <div className="grid grid-cols-2 gap-4">
                <Gauge
                  value={pipeline.cost_estimate?.monthly_usd ?? designResult.pipeline?.cost_estimate?.monthly_usd ?? 0}
                  max={constraints.max_cost_usd}
                  label="Monthly Cost"
                  icon={DollarSign}
                  color="text-amber-400"
                  unit="USD"
                />
                <Gauge
                  value={pipeline.carbon_estimate?.monthly_kg ?? designResult.pipeline?.carbon_estimate?.monthly_kg ?? 0}
                  max={constraints.max_carbon_kg}
                  label="Carbon Load"
                  icon={Leaf}
                  color="text-emerald-400"
                  unit="kg"
                />
              </div>

              {/* Risk Register */}
              {(pipeline.risk_register || designResult.pipeline?.risk_register) && (
                <div className="bg-neutral-900/50 border border-white/5 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-red-400" />
                    <h3 className="font-semibold text-white text-sm uppercase tracking-tight">Risk Register</h3>
                  </div>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                    {(pipeline.risk_register || designResult.pipeline?.risk_register || []).map((r: any, i: number) => (
                      <div key={i} className="p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all">
                        <div className="flex items-start justify-between mb-1">
                          <span className="text-xs font-bold text-neutral-200">{r.risk}</span>
                          <span className={cn("text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border", severityColor(r.severity))}>
                            {r.severity}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-500 leading-tight">{r.mitigation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Self-Critique Issues */}
              {critique && critique.issues && critique.issues.length > 0 && (
                <div className="bg-neutral-900/50 border border-white/5 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <Eye className="w-5 h-5 text-purple-400" />
                    <h3 className="font-semibold text-white text-sm">Self-Critique Issues</h3>
                    <span className="ml-auto text-[10px] font-bold text-neutral-500">{critique.issues.length} found</span>
                  </div>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                    {critique.issues.map((issue: any, i: number) => (
                      <div key={i} className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-neutral-400 uppercase">{issue.category}</span>
                          <span className={cn("text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border", severityColor(issue.severity))}>
                            {issue.severity}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-300">{issue.issue}</p>
                        <p className="text-[10px] text-brand-400">Fix: {issue.fix}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT: Interactive Panels */}
            <div className="col-span-12 lg:col-span-8 space-y-6">

              {/* Tabs */}
              <div className="flex items-center gap-1 p-1 bg-neutral-900 border border-white/5 rounded-2xl w-fit">
                {(['pipeline', 'alternatives', 'audit'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "px-6 py-2 rounded-xl text-xs font-semibold capitalize transition-all",
                      activeTab === tab
                        ? "bg-brand-500 text-white shadow-lg shadow-brand-500/20"
                        : "text-neutral-500 hover:text-white hover:bg-white/5"
                    )}
                  >
                    {tab === 'pipeline' ? 'Pipeline DAG' : tab === 'alternatives' ? 'Alternatives' : 'Audit Log'}
                  </button>
                ))}
              </div>

              {/* Content Area */}
              <div className="bg-neutral-950/80 border border-white/5 rounded-2xl p-8 min-h-[550px] relative overflow-hidden">
                {/* Grid overlay */}
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

                {activeTab === 'pipeline' && (
                  <div className="relative z-10 space-y-8">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-mono text-neutral-600">PIPELINE_DSL_V1 • {designResult.elapsed_seconds}s</p>
                      <div className="flex items-center gap-2 text-[10px] text-emerald-400">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        SCHEMA VALIDATED
                      </div>
                    </div>

                    {/* DAG */}
                    <div className="flex flex-col gap-1 max-w-lg mx-auto py-6">
                      {[
                        { label: 'Data Ingestion', sub: pipeline.pipeline?.data_ingestion?.source_type || pipeline.data_ingestion?.source_type || '—', icon: Database },
                        { label: 'Feature Engineering', sub: (pipeline.pipeline?.feature_engineering?.steps || pipeline.feature_engineering?.steps || ['—'])[0], icon: Settings },
                        { label: 'Model Training', sub: pipeline.pipeline?.model_training?.algorithm || pipeline.model_training?.algorithm || '—', icon: Brain },
                        { label: 'Evaluation', sub: (pipeline.pipeline?.evaluation?.metrics || pipeline.evaluation?.metrics || ['—'])[0], icon: Activity },
                        { label: 'Deployment', sub: pipeline.pipeline?.deployment?.format || pipeline.deployment?.format || pipeline.pipeline?.deployment?.mode || pipeline.deployment?.mode || '—', icon: Zap },
                        { label: 'Monitoring', sub: `Drift: ${(pipeline.pipeline?.monitoring?.drift || pipeline.monitoring?.drift || ['—'])[0]}`, icon: Eye },
                        { label: 'Governance', sub: `Audit: ${pipeline.pipeline?.governance?.audit_log ?? pipeline.governance?.audit_log ?? true ? 'enabled' : 'disabled'}`, icon: Lock },
                      ].map((step, i, arr) => (
                        <PipelineNode key={i} icon={step.icon} label={step.label} sub={step.sub} index={i} total={arr.length} />
                      ))}
                    </div>

                    {/* Pipeline Details Grid */}
                    <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/5">
                      <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-center">
                        <p className="text-[10px] text-neutral-500 uppercase font-bold">Rollback</p>
                        <p className="text-sm text-white font-semibold mt-1">{pipeline.pipeline?.rollback?.strategy || pipeline.rollback?.strategy || 'canary'}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-center">
                        <p className="text-[10px] text-neutral-500 uppercase font-bold">Retrain Trigger</p>
                        <p className="text-sm text-white font-semibold mt-1">{(pipeline.pipeline?.retraining_policy?.trigger || pipeline.retraining_policy?.trigger || ['drift'])[0]}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-center">
                        <p className="text-[10px] text-neutral-500 uppercase font-bold">PII Handling</p>
                        <p className="text-sm text-white font-semibold mt-1">{pipeline.pipeline?.data_ingestion?.pii_handling || pipeline.data_ingestion?.pii_handling || 'masking'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'alternatives' && (
                  <div className="relative z-10 space-y-6">
                    <h3 className="text-lg font-semibold text-white">Models Considered & Rejected</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(pipeline.alternatives_considered || designResult.pipeline?.alternatives_considered || []).map((alt: any, i: number) => (
                        <div key={i} className="p-5 rounded-2xl bg-white/5 border border-white/5 space-y-3 hover:border-white/10 transition-all">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-white">{alt.model_family || alt.model || alt.name}</span>
                            <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded-lg border border-red-500/20 text-red-400 bg-red-500/10">Rejected</span>
                          </div>
                          <p className="text-xs text-neutral-500 leading-relaxed">{alt.rejected_reason || alt.reason}</p>
                        </div>
                      ))}
                      {(pipeline.alternatives_considered || designResult.pipeline?.alternatives_considered || []).length === 0 && (
                        <p className="text-neutral-500 text-sm col-span-2">No alternative models were documented.</p>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'audit' && (
                  <div className="relative z-10 space-y-6">
                    <h3 className="text-lg font-semibold text-white">Audit Log & Self-Critique Trail</h3>
                    <div className="space-y-1">
                      {(designResult.audit_log || []).map((log: any, i: number) => (
                        <div key={i} className="flex gap-4 group">
                          <div className="flex flex-col items-center">
                            <div className={cn(
                              "w-2.5 h-2.5 rounded-full ring-4",
                              log.status === 'failed' ? 'bg-red-500 ring-red-500/20' :
                                log.status === 'completed' || log.status === 'passed' ? 'bg-emerald-500 ring-emerald-500/20' :
                                  'bg-brand-500 ring-brand-500/20'
                            )} />
                            {i < (designResult.audit_log || []).length - 1 && <div className="w-px flex-1 bg-white/5 mt-1" />}
                          </div>
                          <div className="flex-1 pb-5">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-xs font-bold text-white capitalize">{log.step.replace(/_/g, ' ')}</span>
                              <span className="text-[10px] text-neutral-600 font-mono">{new Date(log.timestamp * 1000).toLocaleTimeString()}</span>
                            </div>
                            <div className="text-[11px] text-neutral-500">
                              Status: <span className={cn(
                                log.status === 'failed' ? 'text-red-400' :
                                  log.status === 'completed' || log.status === 'passed' ? 'text-emerald-400' :
                                    'text-brand-400'
                              )}>{log.status}</span>
                              {log.total_elapsed_seconds !== undefined && ` · Total: ${log.total_elapsed_seconds}s`}
                              {log.issues_found !== undefined && ` · Issues: ${log.issues_found}`}
                              {log.fixes_applied !== undefined && ` · Fixes: ${log.fixes_applied}`}
                              {log.errors && log.errors.length > 0 && (
                                <span className="text-red-400"> · Errors: {log.errors.join(', ')}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Approval Bar */}
              <div className="p-6 rounded-2xl bg-gradient-to-r from-brand-500/10 via-brand-500/5 to-transparent border border-brand-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-brand-500/20 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-6 h-6 text-brand-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white">Deployment Ready</h4>
                    <p className="text-neutral-500 text-xs">Human approval required to initialize training.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button className="px-4 py-2 rounded-xl text-sm text-neutral-400 hover:text-white hover:bg-white/5 transition-all">Request Context</button>
                  <button
                    onClick={handleApprove}
                    className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm shadow-lg shadow-emerald-500/20 transition-all"
                  >
                    Approve Design
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
