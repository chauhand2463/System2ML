'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Badge } from '@/components/ui/badge'
import { fetchFailures, fetchPipelines } from '@/lib/api'
import { AlertCircle, Loader2 } from 'lucide-react'

export default function FailuresPage() {
  const [failures, setFailures] = useState<any[]>([])
  const [pipelines, setPipelines] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const [failuresData, pipelinesData] = await Promise.all([
          fetchFailures(),
          fetchPipelines()
        ])
        setFailures(failuresData)
        setPipelines(pipelinesData)
      } catch (e) {
        console.error('Error loading data:', e)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const getPipelineName = (pipelineId: string) => {
    const pipeline = pipelines.find(p => p.id === pipelineId)
    return pipeline?.name || pipelineId
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        <h1 className="text-3xl font-bold text-white mb-2">Failures</h1>
        <p className="text-neutral-400 mb-8">Track and resolve pipeline failures</p>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
          </div>
        ) : failures.length === 0 ? (
          <div className="text-center py-12 text-neutral-500">
            No failures recorded. Great!
          </div>
        ) : (
          <div className="space-y-4">
            {failures.map((failure: any) => (
              <div key={failure.id} className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-danger-500" />
                    <div>
                      <p className="font-medium text-white">{failure.error_type}</p>
                      <p className="text-sm text-neutral-400">{failure.error_message}</p>
                    </div>
                  </div>
                  <Badge className={failure.is_resolved ? 'bg-success-500/10 text-success-500' : 'bg-danger-500/10 text-danger-500'}>
                    {failure.is_resolved ? 'Resolved' : 'Open'}
                  </Badge>
                </div>
                {failure.suggested_fix && (
                  <div className="mt-3 p-3 rounded bg-neutral-800 text-sm text-neutral-300">
                    Fix: {failure.suggested_fix}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
