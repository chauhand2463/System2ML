'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { TerminalLayout } from '@/components/layout/terminal-layout'
import { useDesign } from '@/hooks/use-design'
import { validateConstraints, getFeasibilityPolicy } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function DesignConstraintsPage() {
  const router = useRouter()
  const { dataset, constraints, setConstraints, setDesignStep, canProceedToDesign } = useDesign()
  
  const [validating, setValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<any>(null)
  const [feasibilityPolicy, setFeasibilityPolicy] = useState<any>(null)
  
  const [formData, setFormData] = useState({
    maxCostUsd: constraints.maxCostUsd,
    maxCarbonKg: constraints.maxCarbonKg,
    maxLatencyMs: constraints.maxLatencyMs,
    complianceLevel: constraints.complianceLevel,
  })

  useEffect(() => {
    if (!canProceedToDesign) {
      router.push('/datasets/new')
    }
  }, [canProceedToDesign, router])

  if (!dataset) {
    return null
  }

  const handleValidate = async () => {
    setValidating(true)
    setValidationResult(null)
    setFeasibilityPolicy(null)
    
    try {
      setConstraints(formData)
      
      const request = {
        data_profile: { type: dataset.type },
        objective: constraints.objective,
        constraints: {
          max_cost_usd: formData.maxCostUsd,
          max_carbon_kg: formData.maxCarbonKg,
          max_latency_ms: formData.maxLatencyMs,
          compliance_level: formData.complianceLevel,
        },
        deployment: 'batch',
      }
      
      const validation = await validateConstraints(request)
      setValidationResult(validation)
      
      if (validation.is_valid) {
        const policy = await getFeasibilityPolicy(request)
        setFeasibilityPolicy(policy)
      }
    } catch (error) {
      console.error('Validation error:', error)
    } finally {
      setValidating(false)
    }
  }

  const handleNext = () => {
    if (validationResult?.is_valid) {
      setConstraints(formData)
      setDesignStep('preferences')
      router.push('/design/preferences')
    }
  }

  const handleBack = () => {
    router.push('/design/input')
  }

  return (
    <TerminalLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold text-white">
            <span className="text-cyan-400">$</span> ./set_constraints.sh --validate
          </h1>
          <p className="text-[#8b949e] text-sm mt-1 font-mono">
            Define cost, carbon, and latency limits
          </p>
        </div>

        <div className="bg-[#0d1117] border border-[#30363d] rounded">
          <div className="bg-[#161b22] px-4 py-2 border-b border-[#30363d]">
            <span className="text-sm text-[#8b949e] font-mono">
              <span className="text-cyan-400">$</span> active_dataset
            </span>
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-cyan-400">›</span>
                <div>
                  <p className="text-white font-medium">{dataset.name}</p>
                  <p className="text-[#8b949e] text-sm">
                    {dataset.rows?.toLocaleString()} rows × {dataset.features} features
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Badge className="bg-cyan-500/20 text-cyan-400 text-xs">{dataset.type}</Badge>
                <Badge className="bg-purple-500/20 text-purple-400 text-xs">{dataset.inferredTask}</Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#0d1117] border border-[#30363d] rounded">
          <div className="bg-[#161b22] px-4 py-2 border-b border-[#30363d]">
            <span className="text-sm text-[#8b949e] font-mono">
              <span className="text-cyan-400">$</span> resource_constraints
            </span>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-[#8b949e] text-xs font-mono">
                  <span className="text-cyan-400">$</span> max_cost_usd
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b949e]">$</span>
                  <Input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={formData.maxCostUsd}
                    onChange={(e) => setFormData({ ...formData, maxCostUsd: parseFloat(e.target.value) })}
                    className="pl-7 bg-[#0a0a0a] border-[#30363d] text-white font-mono"
                  />
                </div>
                <p className="text-xs text-[#6e7681]">training budget</p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-[#8b949e] text-xs font-mono">
                  <span className="text-cyan-400">$</span> max_carbon_kg
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.maxCarbonKg}
                  onChange={(e) => setFormData({ ...formData, maxCarbonKg: parseFloat(e.target.value) })}
                  className="bg-[#0a0a0a] border-[#30363d] text-white font-mono"
                />
                <p className="text-xs text-[#6e7681]">carbon emissions</p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-[#8b949e] text-xs font-mono">
                  <span className="text-cyan-400">$</span> max_latency_ms
                </Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.maxLatencyMs}
                  onChange={(e) => setFormData({ ...formData, maxLatencyMs: parseInt(e.target.value) })}
                  className="bg-[#0a0a0a] border-[#30363d] text-white font-mono"
                />
                <p className="text-xs text-[#6e7681]">inference latency</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[#8b949e] text-xs font-mono">
                <span className="text-cyan-400">$</span> compliance_level
              </Label>
              <select
                value={formData.complianceLevel}
                onChange={(e) => setFormData({ ...formData, complianceLevel: e.target.value as any })}
                className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#30363d] rounded text-white font-mono text-sm"
              >
                <option value="none">none</option>
                <option value="standard">standard</option>
                <option value="regulated">regulated</option>
                <option value="highly_regulated">highly_regulated</option>
              </select>
              <p className="text-xs text-[#6e7681]">regulatory requirements</p>
            </div>

            <Button
              onClick={handleValidate}
              disabled={validating}
              className="w-full bg-[#1f6feb] hover:bg-[#388bfd] text-white font-mono"
            >
              {validating ? (
                <span className="animate-pulse">validating...</span>
              ) : (
                <span><span className="mr-2">⚡</span>validate_constraints</span>
              )}
            </Button>

            {validationResult && (
              <div className={`rounded p-4 ${
                validationResult.is_valid 
                  ? 'bg-emerald-500/10 border border-emerald-500/30' 
                  : 'bg-red-500/10 border border-red-500/30'
              }`}>
                <div className="flex items-center gap-2 mb-3">
                  {validationResult.is_valid ? (
                    <span className="text-emerald-400">✓</span>
                  ) : (
                    <span className="text-red-400">✗</span>
                  )}
                  <span className={`font-mono text-sm ${
                    validationResult.is_valid ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {validationResult.is_valid ? 'constraints_valid' : 'constraint_violations'}
                  </span>
                </div>
                
                {validationResult.violations?.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {validationResult.violations.map((v: any, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-[#c9d1d9] font-mono">
                        <span className="text-red-400">›</span>
                        {v.message}
                      </div>
                    ))}
                  </div>
                )}
                
                {validationResult.suggestions?.length > 0 && (
                  <div className="pt-3 border-t border-[#30363d]">
                    <p className="text-xs text-[#8b949e] mb-2 font-mono">suggestions:</p>
                    {validationResult.suggestions.map((s: any, i: number) => (
                      <div key={i} className="text-sm text-[#6e7681] font-mono mb-1">
                        • {s.reason}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {feasibilityPolicy && (
              <div className="rounded p-4 bg-[#161b22] border border-[#30363d]">
                <h4 className="text-sm font-medium text-white mb-3 font-mono">
                  <span className="text-cyan-400">$</span> feasibility_policy
                </h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-[#8b949e] mb-1 font-mono">eligible_model_families:</p>
                    <div className="flex flex-wrap gap-1">
                      {feasibilityPolicy.eligible_model_families?.map((f: string) => (
                        <Badge key={f} className="bg-cyan-500/20 text-cyan-400 text-xs font-mono">
                          {f}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-[#8b949e] mb-1 font-mono">hard_constraints:</p>
                    <div className="flex flex-wrap gap-1">
                      {feasibilityPolicy.hard_constraints?.map((c: string) => (
                        <Badge key={c} className="bg-red-500/20 text-red-400 text-xs font-mono">
                          {c}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={handleBack} className="font-mono border-[#30363d] text-[#c9d1d9]">
                <span className="mr-2">←</span>
                back
              </Button>
              <Button
                onClick={handleNext}
                disabled={!validationResult?.is_valid}
                className="bg-[#238636] hover:bg-[#2ea043] text-white font-mono"
              >
                <span className="mr-2">→</span>
                continue_to_preferences
              </Button>
            </div>
          </div>
        </div>
      </div>
    </TerminalLayout>
  )
}
