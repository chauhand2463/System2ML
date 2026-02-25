'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { fetchPipelines, fetchMetrics } from '@/lib/api'
import { Loader2, TrendingUp, Activity, Zap, BarChart3, Gauge, Target, Clock } from 'lucide-react'

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

  const stats = [
    { 
      label: 'Active Pipelines', 
      value: pipelines.filter(p => p.status === 'active').length, 
      icon: Activity, 
      color: 'from-emerald-500 to-emerald-600',
      bg: 'bg-emerald-500/10'
    },
    { 
      label: 'Total Runs', 
      value: runs.length, 
      icon: Zap, 
      color: 'from-brand-500 to-brand-600',
      bg: 'bg-brand-500/10'
    },
    { 
      label: 'Avg Accuracy', 
      value: `${((metrics?.avg_accuracy || 0) * 100).toFixed(1)}%`, 
      icon: Target, 
      color: 'from-purple-500 to-purple-600',
      bg: 'bg-purple-500/10'
    },
    { 
      label: 'Avg Latency', 
      value: `${(metrics?.avg_latency || 0).toFixed(0)}ms`, 
      icon: Clock, 
      color: 'from-amber-500 to-amber-600',
      bg: 'bg-amber-500/10'
    },
  ]

  return (
    <DashboardLayout>
      <div className="p-8 min-h-screen">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Monitoring</h1>
          <p className="text-neutral-400">Real-time pipeline monitoring and metrics</p>
        </div>

        {/* Stats Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {stats.map((stat, i) => {
                const Icon = stat.icon
                return (
                  <div 
                    key={i}
                    className="relative group overflow-hidden rounded-2xl bg-neutral-900/50 backdrop-blur-xl border border-white/5 p-6 hover:border-brand-500/30 transition-all duration-500 hover:scale-[1.02]"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    
                    <div className="relative">
                      <div className="flex items-center justify-between mb-4">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                      </div>
                      <p className="text-neutral-400 text-sm mb-1">{stat.label}</p>
                      <p className="text-3xl font-bold text-white">{stat.value}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Charts Placeholder */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-2xl bg-neutral-900/50 backdrop-blur-xl border border-white/5 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-white">Performance Overview</h2>
                  <TrendingUp className="w-5 h-5 text-brand-400" />
                </div>
                <div className="h-48 flex items-center justify-center text-neutral-600">
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Performance chart coming soon</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-neutral-900/50 backdrop-blur-xl border border-white/5 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-white">Resource Usage</h2>
                  <Gauge className="w-5 h-5 text-brand-400" />
                </div>
                <div className="h-48 flex items-center justify-center text-neutral-600">
                  <div className="text-center">
                    <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Resource metrics coming soon</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
