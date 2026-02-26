'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { useDesign } from '@/hooks/use-design'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Database, BarChart3, ArrowRight, AlertTriangle, Shield,
  HardDrive, Tag, Clock
} from 'lucide-react'

export default function DesignInputPage() {
  const router = useRouter()
  const { dataset, canProceedToDesign, setDesignStep } = useDesign()

  useEffect(() => {
    if (!canProceedToDesign) {
      router.push('/datasets/new')
    }
  }, [canProceedToDesign, router])

  if (!dataset) {
    return null
  }

  const handleNext = () => {
    setDesignStep('constraints')
    router.push('/design/constraints')
  }

  return (
    <DashboardLayout>
      <div className="p-8 min-h-screen">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Design Input</h1>
            <p className="text-neutral-400">
              Review your dataset and configure design parameters
            </p>
          </div>

          {/* Dataset Summary - Always Visible */}
          <Card className="bg-neutral-900/50 border-white/5 mb-6">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2">
                  <Database className="w-5 h-5 text-brand-400" />
                  Active Dataset
                </CardTitle>
                <Badge className="bg-emerald-500/20 text-emerald-400">
                  Validated
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 rounded-lg bg-neutral-800/50">
                  <div className="flex items-center gap-2 text-neutral-400 mb-1">
                    <HardDrive className="w-3 h-3" />
                    <span className="text-xs">Size</span>
                  </div>
                  <p className="text-lg font-semibold text-white">{dataset.sizeMb.toFixed(1)} MB</p>
                </div>
                <div className="p-3 rounded-lg bg-neutral-800/50">
                  <div className="flex items-center gap-2 text-neutral-400 mb-1">
                    <BarChart3 className="w-3 h-3" />
                    <span className="text-xs">Rows</span>
                  </div>
                  <p className="text-lg font-semibold text-white">{dataset.rows?.toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-lg bg-neutral-800/50">
                  <div className="flex items-center gap-2 text-neutral-400 mb-1">
                    <Tag className="w-3 h-3" />
                    <span className="text-xs">Features</span>
                  </div>
                  <p className="text-lg font-semibold text-white">{dataset.features}</p>
                </div>
                <div className="p-3 rounded-lg bg-neutral-800/50">
                  <div className="flex items-center gap-2 text-neutral-400 mb-1">
                    <Clock className="w-3 h-3" />
                    <span className="text-xs">Missing</span>
                  </div>
                  <p className="text-lg font-semibold text-white">{dataset.missingValues}%</p>
                </div>
              </div>
              
              <div className="flex gap-2 mt-4">
                <Badge className="bg-brand-500/20 text-brand-400">{dataset.type}</Badge>
                <Badge className="bg-purple-500/20 text-purple-400">{dataset.inferredTask}</Badge>
                {dataset.labelPresent && (
                  <Badge className="bg-emerald-500/20 text-emerald-400">Label: {dataset.labelType}</Badge>
                )}
                {dataset.piiDetected && (
                  <Badge className="bg-red-500/20 text-red-400">
                    <Shield className="w-3 h-3 mr-1" />
                    PII
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Design Parameters */}
          <Card className="bg-neutral-900/50 border-white/5">
            <CardHeader>
              <CardTitle className="text-white">Configure Design</CardTitle>
              <CardDescription className="text-neutral-400">
                Set your ML pipeline objectives and constraints
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm text-neutral-400">Primary Objective</label>
                  <select className="w-full px-4 py-3 rounded-xl bg-neutral-800/50 border border-white/10 text-white">
                    <option value="accuracy">Maximize Accuracy</option>
                    <option value="cost">Minimize Cost</option>
                    <option value="speed">Minimize Latency</option>
                    <option value="carbon">Minimize Carbon</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-neutral-400">Deployment Mode</label>
                  <select className="w-full px-4 py-3 rounded-xl bg-neutral-800/50 border border-white/10 text-white">
                    <option value="batch">Batch Processing</option>
                    <option value="realtime">Real-time Inference</option>
                    <option value="edge">Edge Deployment</option>
                  </select>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-brand-500/10 border border-brand-500/20">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-brand-400 mt-0.5" />
                  <div>
                    <p className="text-white font-medium">Next Step: Constraints</p>
                    <p className="text-neutral-400 text-sm">
                      You&apos;ll set your cost, carbon, and latency constraints in the next step.
                      The system will validate these constraints and ensure feasibility.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleNext}
                  className="bg-gradient-to-r from-brand-500 to-brand-600"
                  size="lg"
                >
                  Continue to Constraints
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