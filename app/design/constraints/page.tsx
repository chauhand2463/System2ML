'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { useDesign } from '@/hooks/use-design'
import { validateConstraints, getFeasibilityPolicy } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Database, BarChart3, ArrowRight, ArrowLeft, AlertTriangle, Shield,
  HardDrive, Tag, Clock, CheckCircle, XCircle, Loader2
} from 'lucide-react'

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
      // Update constraints in state
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
    <DashboardLayout>
      <div className="p-8 min-h-screen">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Set Constraints</h1>
            <p className="text-neutral-400">
              Define your cost, carbon, and latency limits
            </p>
          </div>

          {/* Dataset Summary - Always Visible */}
          <Card className="bg-neutral-900/50 border-white/5 mb-6">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-brand-500/20">
                    <Database className="w-5 h-5 text-brand-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{dataset.name}</p>
                    <p className="text-neutral-400 text-sm">
                      {dataset.rows?.toLocaleString()} rows × {dataset.features} features
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge className="bg-brand-500/20 text-brand-400">{dataset.type}</Badge>
                  <Badge className="bg-purple-500/20 text-purple-400">{dataset.inferredTask}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Constraints Form */}
          <Card className="bg-neutral-900/50 border-white/5">
            <CardHeader>
              <CardTitle className="text-white">Resource Constraints</CardTitle>
              <CardDescription className="text-neutral-400">
                Set maximum allowable values for training and deployment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-neutral-400">Max Cost (USD)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">$</span>
                    <Input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={formData.maxCostUsd}
                      onChange={(e) => setFormData({ ...formData, maxCostUsd: parseFloat(e.target.value) })}
                      className="pl-7 bg-neutral-800/50 border-white/10 text-white"
                    />
                  </div>
                  <p className="text-xs text-neutral-500">Training budget</p>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-neutral-400">Max Carbon (kg)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.maxCarbonKg}
                    onChange={(e) => setFormData({ ...formData, maxCarbonKg: parseFloat(e.target.value) })}
                    className="bg-neutral-800/50 border-white/10 text-white"
                  />
                  <p className="text-xs text-neutral-500">Carbon emissions</p>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-neutral-400">Max Latency (ms)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.maxLatencyMs}
                    onChange={(e) => setFormData({ ...formData, maxLatencyMs: parseInt(e.target.value) })}
                    className="bg-neutral-800/50 border-white/10 text-white"
                  />
                  <p className="text-xs text-neutral-500">Inference latency</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-neutral-400">Compliance Level</Label>
                <select
                  value={formData.complianceLevel}
                  onChange={(e) => setFormData({ ...formData, complianceLevel: e.target.value as any })}
                  className="w-full px-4 py-3 rounded-xl bg-neutral-800/50 border border-white/10 text-white"
                >
                  <option value="none">None</option>
                  <option value="standard">Standard</option>
                  <option value="regulated">Regulated</option>
                  <option value="highly_regulated">Highly Regulated</option>
                </select>
                <p className="text-xs text-neutral-500">Regulatory requirements</p>
              </div>

              {/* Validation Button */}
              <Button
                onClick={handleValidate}
                disabled={validating}
                className="w-full bg-gradient-to-r from-brand-500 to-brand-600"
              >
                {validating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Validating Constraints...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Validate Constraints
                  </>
                )}
              </Button>

              {/* Validation Results */}
              {validationResult && (
                <div className={`rounded-xl p-4 ${
                  validationResult.is_valid 
                    ? 'bg-emerald-500/10 border border-emerald-500/20' 
                    : 'bg-red-500/10 border border-red-500/20'
                }`}>
                  <div className="flex items-center gap-2 mb-3">
                    {validationResult.is_valid ? (
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-400" />
                    )}
                    <span className={`font-medium ${
                      validationResult.is_valid ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {validationResult.is_valid ? 'Constraints Valid' : 'Constraint Violations'}
                    </span>
                  </div>
                  
                  {/* Violations */}
                  {validationResult.violations?.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {validationResult.violations.map((v: any, i: number) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5" />
                          <span className="text-neutral-300">{v.message}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Suggestions */}
                  {validationResult.suggestions?.length > 0 && (
                    <div className="pt-3 border-t border-neutral-700">
                      <p className="text-sm text-neutral-400 mb-2">Suggestions:</p>
                      {validationResult.suggestions.map((s: any, i: number) => (
                        <div key={i} className="text-sm text-neutral-500 mb-1">
                          • {s.reason}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Feasibility Policy */}
              {feasibilityPolicy && (
                <div className="rounded-xl p-4 bg-neutral-800/50">
                  <h4 className="text-sm font-medium text-white mb-3">Feasibility Policy</h4>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-neutral-400 mb-1">Eligible Model Families</p>
                      <div className="flex flex-wrap gap-1">
                        {feasibilityPolicy.eligible_model_families?.map((f: string) => (
                          <Badge key={f} className="bg-brand-500/20 text-brand-400 text-xs">
                            {f}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-400 mb-1">Hard Constraints</p>
                      <div className="flex flex-wrap gap-1">
                        {feasibilityPolicy.hard_constraints?.map((c: string) => (
                          <Badge key={c} className="bg-red-500/20 text-red-400 text-xs">
                            {c}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={handleBack}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={!validationResult?.is_valid}
                  className="bg-gradient-to-r from-brand-500 to-brand-600"
                >
                  Continue to Preferences
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}