'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { fetchPipelines, fetchMetrics } from '@/lib/api'
import { Loader2, TrendingUp, Activity, Zap } from 'lucide-react'

export default function MonitoringPage() {
  const [pipelines, setPipelines] = useState<any[]>([])
  const [metrics, setMetrics] = useState<any>({})
  const [runs, setRuns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const [pipelinesData, metricsData, runsData] = await Promise.all([
          fetchPipelines(),
          fetchMetrics(),
          fetchPipelineRuns()
        ])
        setPipelines(pipelinesData)
        setMetrics(metricsData)
        setRuns(runsData)
      } catch (e) {
        console.error('Error loading data:', e)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  async function fetchPipelineRuns() {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/runs`)
    const data = await res.json()
    return data.runs || []
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        <h1 className="text-3xl font-bold text-white mb-2">Monitoring</h1>
        <p className="text-neutral-400 mb-8">Real-time pipeline monitoring and metrics</p>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
                <div className="flex items-center gap-3">
                  <Activity className="w-8 h-8 text-brand-500" />
                  <div>
                    <p className="text-neutral-400 text-sm">Active Pipelines</p>
                    <p className="text-2xl font-bold text-white">{pipelines.filter(p => p.status === 'active').length}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-8 h-8 text-success-500" />
                  <div>
                    <p className="text-neutral-400 text-sm">Avg Accuracy</p>
                    <p className="text-2xl font-bold text-white">{((metrics.avg_accuracy || 0) * 100).toFixed(1)}%</p>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
                <div className="flex items-center gap-3">
                  <Zap className="w-8 h-8 text-warning-500" />
                  <div>
                    <p className="text-neutral-400 text-sm">Avg Cost</p>
                    <p className="text-2xl font-bold text-white">${(metrics.avg_cost || 0).toFixed(2)}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
                <div className="flex items-center gap-3">
                  <Activity className="w-8 h-8 text-info-500" />
                  <div>
                    <p className="text-neutral-400 text-sm">Total Runs</p>
                    <p className="text-2xl font-bold text-white">{runs.length}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
              <h2 className="text-lg font-bold text-white mb-4">System Status</h2>
              <p className="text-neutral-400">All systems operational. No alerts.</p>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
