'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { TerminalLayout } from '@/components/layout/terminal-layout'
import { useDesign } from '@/hooks/use-design'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Database, BarChart3, ArrowRight, ArrowLeft, Zap, 
  Target, Clock, Leaf, Settings
} from 'lucide-react'

export default function DesignPreferencesPage() {
  const router = useRouter()
  const { dataset, constraints, setConstraints, setDesignStep, canProceedToDesign } = useDesign()
  
  const [formData, setFormData] = useState({
    objective: constraints.objective,
    deployment: 'batch' as const,
    retraining: 'none' as const,
    modelPreferences: [] as string[],
  })

  useEffect(() => {
    if (!canProceedToDesign) {
      router.push('/datasets/new')
    }
  }, [canProceedToDesign, router])

  if (!dataset) {
    return null
  }

  const objectives = [
    { value: 'accuracy', label: 'Accuracy', icon: Target, desc: 'Maximize model performance' },
    { value: 'cost', label: 'Cost', icon: Zap, desc: 'Minimize training cost' },
    { value: 'speed', label: 'Speed', icon: Clock, desc: 'Minimize inference latency' },
    { value: 'carbon', label: 'Carbon', icon: Leaf, desc: 'Minimize carbon emissions' },
  ]

  const deployments = [
    { value: 'batch', label: 'Batch Processing', desc: 'Process large datasets periodically' },
    { value: 'realtime', label: 'Real-time', desc: 'Low-latency online inference' },
    { value: 'edge', label: 'Edge', desc: 'Deploy on edge devices' },
  ]

  const retrainings = [
    { value: 'none', label: 'No Retraining', desc: 'Static model' },
    { value: 'time', label: 'Scheduled', desc: 'Retrain at fixed intervals' },
    { value: 'drift', label: 'Drift-based', desc: 'Retrain on data drift detection' },
  ]

  const modelOptions = [
    'Interpretable Models',
    'Fast Inference',
    'Low Memory',
    'GPU Required',
    'Transfer Learning',
  ]

  const handleNext = () => {
    setConstraints({
      ...constraints,
      ...formData,
    })
    setDesignStep('review')
    router.push('/design/review')
  }

  const handleBack = () => {
    router.push('/design/constraints')
  }

  return (
    <TerminalLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold text-white">
            <span className="text-cyan-400">$</span> ./design_preferences.sh --configure
          </h1>
          <p className="text-[#8b949e] text-sm mt-1 font-mono">
            Configure deployment and model preferences
          </p>
        </div>

        <div className="bg-[#0d1117] border border-[#30363d] rounded">
          <div className="bg-[#161b22] px-4 py-2 border-b border-[#30363d]">
            <span className="text-sm text-[#8b949e] font-mono">
              <span className="text-cyan-400">$</span> active_dataset
            </span>
          </div>
          <div className="p-4">
            <div className="flex items-center gap-3">
              <span className="text-cyan-400">›</span>
              <div>
                <p className="text-white font-medium">{dataset.name}</p>
                <p className="text-[#8b949e] text-sm">
                  {dataset.rows?.toLocaleString()} rows × {dataset.features} features
                </p>
              </div>
            </div>
          </div>
        </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge className="bg-brand-500/20 text-brand-400">${constraints.maxCostUsd}</Badge>
                  <Badge className="bg-emerald-500/20 text-emerald-400">{constraints.maxCarbonKg}kg</Badge>
                  <Badge className="bg-purple-500/20 text-purple-400">{constraints.maxLatencyMs}ms</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            {/* Objective Selection */}
            <Card className="bg-neutral-900/50 border-white/5">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Target className="w-5 h-5 text-brand-400" />
                  Primary Objective
                </CardTitle>
                <CardDescription className="text-neutral-400">
                  What do you want to optimize for?
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {objectives.map((obj) => {
                    const Icon = obj.icon
                    const isSelected = formData.objective === obj.value
                    return (
                      <button
                        key={obj.value}
                        onClick={() => setFormData({ ...formData, objective: obj.value as any })}
                        className={`p-4 rounded-xl border text-left transition-all ${
                          isSelected 
                            ? 'bg-brand-500/20 border-brand-500' 
                            : 'bg-neutral-800/30 border-neutral-700 hover:border-neutral-600'
                        }`}
                      >
                        <Icon className={`w-5 h-5 mb-2 ${isSelected ? 'text-brand-400' : 'text-neutral-400'}`} />
                        <p className={`font-medium ${isSelected ? 'text-white' : 'text-neutral-300'}`}>
                          {obj.label}
                        </p>
                        <p className="text-xs text-neutral-500 mt-1">{obj.desc}</p>
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Deployment Mode */}
            <Card className="bg-neutral-900/50 border-white/5">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-brand-400" />
                  Deployment Mode
                </CardTitle>
                <CardDescription className="text-neutral-400">
                  How will the model be used?
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {deployments.map((dep) => {
                    const isSelected = formData.deployment === dep.value
                    return (
                      <button
                        key={dep.value}
                        onClick={() => setFormData({ ...formData, deployment: dep.value as any })}
                        className={`p-4 rounded-xl border text-left transition-all ${
                          isSelected 
                            ? 'bg-brand-500/20 border-brand-500' 
                            : 'bg-neutral-800/30 border-neutral-700 hover:border-neutral-600'
                        }`}
                      >
                        <p className={`font-medium ${isSelected ? 'text-white' : 'text-neutral-300'}`}>
                          {dep.label}
                        </p>
                        <p className="text-xs text-neutral-500 mt-1">{dep.desc}</p>
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Retraining Strategy */}
            <Card className="bg-neutral-900/50 border-white/5">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-brand-400" />
                  Retraining Strategy
                </CardTitle>
                <CardDescription className="text-neutral-400">
                  How often should the model be retrained?
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {retrainings.map((ret) => {
                    const isSelected = formData.retraining === ret.value
                    return (
                      <button
                        key={ret.value}
                        onClick={() => setFormData({ ...formData, retraining: ret.value as any })}
                        className={`p-4 rounded-xl border text-left transition-all ${
                          isSelected 
                            ? 'bg-brand-500/20 border-brand-500' 
                            : 'bg-neutral-800/30 border-neutral-700 hover:border-neutral-600'
                        }`}
                      >
                        <p className={`font-medium ${isSelected ? 'text-white' : 'text-neutral-300'}`}>
                          {ret.label}
                        </p>
                        <p className="text-xs text-neutral-500 mt-1">{ret.desc}</p>
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Model Preferences */}
            <Card className="bg-neutral-900/50 border-white/5">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Settings className="w-5 h-5 text-brand-400" />
                  Model Preferences
                </CardTitle>
                <CardDescription className="text-neutral-400">
                  Additional requirements (optional)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {modelOptions.map((opt) => {
                    const isSelected = formData.modelPreferences.includes(opt)
                    return (
                      <button
                        key={opt}
                        onClick={() => {
                          if (isSelected) {
                            setFormData({
                              ...formData,
                              modelPreferences: formData.modelPreferences.filter(p => p !== opt)
                            })
                          } else {
                            setFormData({
                              ...formData,
                              modelPreferences: [...formData.modelPreferences, opt]
                            })
                          }
                        }}
                        className={`px-4 py-2 rounded-full border text-sm transition-all ${
                          isSelected 
                            ? 'bg-brand-500/20 border-brand-500 text-brand-400' 
                            : 'bg-neutral-800/30 border-neutral-700 text-neutral-400 hover:border-neutral-600'
                        }`}
                      >
                        {opt}
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleNext}
                className="bg-gradient-to-r from-brand-500 to-brand-600"
              >
                Review & Validate
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </TerminalLayout>
  )
}