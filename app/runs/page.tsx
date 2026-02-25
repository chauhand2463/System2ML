'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { fetchPipelineRuns, fetchPipelines } from '@/lib/api'
import { CheckCircle2, AlertCircle, Clock, Loader2, Play, ArrowUpRight, Activity, Zap } from 'lucide-react'
import Link from 'next/link'

export default function RunsPage() {
  const [runs, setRuns] = useState<any[]>([])
  const [pipelines, setPipelines] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    async function loadData() {
      try {
        const [runsData, pipelinesData] = await Promise.all([
          fetchPipelineRuns(),
          fetchPipelines()
        ])
        setRuns(runsData)
        setPipelines(pipelinesData)
      } catch (e) {
        console.error('Error loading data:', e)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const filteredRuns = filter === 'all' ? runs : runs.filter((r: any) => r.status === filter)

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'completed': 
        return { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' }
      case 'failed': 
        return { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' }
      case 'running': 
        return { icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' }
      default: 
        return { icon: Clock, color: 'text-neutral-400', bg: 'bg-neutral-500/10', border: 'border-neutral-500/20' }
    }
  }

  const getPipelineName = (pipelineId: string) => {
    const pipeline = pipelines.find(p => p.id === pipelineId)
    return pipeline?.name || pipelineId
  }

  const stats = [
    { label: 'Total', value: runs.length, color: 'from-neutral-500 to-neutral-600' },
    { label: 'Completed', value: runs.filter((r: any) => r.status === 'completed').length, color: 'from-emerald-500 to-emerald-600' },
    { label: 'Running', value: runs.filter((r: any) => r.status === 'running').length, color: 'from-blue-500 to-blue-600' },
    { label: 'Failed', value: runs.filter((r: any) => r.status === 'failed').length, color: 'from-red-500 to-red-600' },
  ]

  return (
    <DashboardLayout>
      <div className="p-8 min-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Pipeline Runs</h1>
            <p className="text-neutral-400">View execution history of your pipelines</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, i) => (
            <div 
              key={i}
              onClick={() => setFilter(stat.label.toLowerCase() === 'total' ? 'all' : stat.label.toLowerCase())}
              className={`cursor-pointer relative overflow-hidden rounded-2xl bg-neutral-900/50 backdrop-blur-xl border border-white/5 p-5 hover:border-brand-500/30 transition-all duration-500 ${filter === (stat.label.toLowerCase() === 'total' ? 'all' : stat.label.toLowerCase()) ? 'border-brand-500/30' : ''}`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500" />
              <div className="relative">
                <p className="text-neutral-400 text-sm mb-1">{stat.label}</p>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 mb-6">
          {['all', 'completed', 'running', 'failed'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                filter === status 
                  ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30' 
                  : 'bg-neutral-900/50 text-neutral-400 border border-white/5 hover:border-white/10'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
          </div>
        ) : filteredRuns.length === 0 ? (
          <div className="text-center py-20 rounded-2xl bg-neutral-900/30 border border-white/5">
            <div className="w-20 h-20 rounded-2xl bg-neutral-800/50 flex items-center justify-center mx-auto mb-4">
              <Activity className="w-10 h-10 text-neutral-600" />
            </div>
            <p className="text-neutral-500 mb-2">No runs found</p>
            <p className="text-neutral-600 text-sm mb-6">Execute a pipeline to see runs here</p>
            <Link href="/pipelines">
              <Button className="bg-brand-500 hover:bg-brand-600">
                View Pipelines
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredRuns.map((run: any) => {
              const statusConfig = getStatusConfig(run.status)
              const StatusIcon = statusConfig.icon
              return (
                <div 
                  key={run.id} 
                  className="group relative overflow-hidden rounded-2xl bg-neutral-900/50 backdrop-blur-xl border border-white/5 p-6 hover:border-brand-500/30 transition-all duration-300"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-brand-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl ${statusConfig.bg} flex items-center justify-center border ${statusConfig.border}`}>
                        <StatusIcon className={`w-6 h-6 ${statusConfig.color} ${run.status === 'running' ? 'animate-spin' : ''}`} />
                      </div>
                      <div>
                        <p className="font-semibold text-white">Run #{run.id?.slice(0, 8)}</p>
                        <p className="text-neutral-400 text-sm flex items-center gap-2">
                          <Zap className="w-3 h-3" />
                          {getPipelineName(run.pipeline_id)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      {run.metrics && (
                        <div className="text-right">
                          <p className="text-white font-medium">{(run.metrics.accuracy * 100).toFixed(1)}%</p>
                          <p className="text-neutral-500 text-xs">accuracy</p>
                        </div>
                      )}
                      <span className={`px-4 py-1.5 rounded-full text-xs font-semibold ${statusConfig.bg} ${statusConfig.color} border ${statusConfig.border}`}>
                        {run.status}
                      </span>
                      <Link href={`/runs/${run.id}`}>
                        <button className="p-2 rounded-lg bg-neutral-800/50 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all">
                          <ArrowUpRight className="w-4 h-4" />
                        </button>
                      </Link>
                    </div>
                  </div>
                  
                  {run.started_at && (
                    <div className="mt-4 pt-4 border-t border-white/5 flex gap-6 text-sm text-neutral-500">
                      <span className="flex items-center gap-2">
                        <Play className="w-4 h-4" />
                        Started: {new Date(run.started_at).toLocaleString()}
                      </span>
                      {run.completed_at && (
                        <span className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" />
                          Completed: {new Date(run.completed_at).toLocaleString()}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
