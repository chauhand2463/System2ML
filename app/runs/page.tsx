'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { fetchPipelineRuns, fetchPipelines } from '@/lib/api'
import { CheckCircle2, AlertCircle, Clock, Loader2, Play, ArrowUpRight, Activity, Zap, TrendingUp, DollarSign, Leaf } from 'lucide-react'
import Link from 'next/link'

export default function RunsPage() {
  const [runs, setRuns] = useState<any[]>([])
  const [pipelines, setPipelines] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    async function loadData() {
      try {
        const [runsData, pipelinesData] = await Promise.all([
          fetchPipelineRuns(),
          fetchPipelines()
        ])
        setRuns(runsData || [])
        setPipelines(pipelinesData || [])
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
        return { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'Completed' }
      case 'failed':
        return { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', label: 'Failed' }
      case 'running':
        return { icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', label: 'Running' }
      default:
        return { icon: Clock, color: 'text-neutral-400', bg: 'bg-neutral-500/10', border: 'border-neutral-500/20', label: 'Pending' }
    }
  }

  const getPipelineName = (pipelineId: string) => {
    const pipeline = pipelines.find(p => p.id === pipelineId)
    return pipeline?.name || pipelineId
  }

  const stats = [
    { label: 'Total Runs', value: runs.length, color: 'from-neutral-500 to-neutral-600', icon: Activity },
    { label: 'Completed', value: runs.filter((r: any) => r.status === 'completed').length, color: 'from-emerald-500 to-emerald-600', icon: CheckCircle2 },
    { label: 'Running', value: runs.filter((r: any) => r.status === 'running').length, color: 'from-blue-500 to-blue-600', icon: Clock },
    { label: 'Failed', value: runs.filter((r: any) => r.status === 'failed').length, color: 'from-red-500 to-red-600', icon: AlertCircle },
  ]

  return (
    <DashboardLayout>
      <div className="p-8 min-h-screen">
        {/* Header */}
        <div className={`flex items-center justify-between mb-8 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Pipeline Runs</h1>
            <p className="text-neutral-400">View execution history of your pipelines</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, i) => {
            const Icon = stat.icon
            return (
              <div
                key={i}
                onClick={() => setFilter(stat.label.toLowerCase() === 'total runs' ? 'all' : stat.label.toLowerCase())}
                className={`cursor-pointer relative overflow-hidden rounded-2xl bg-neutral-900/50 backdrop-blur-xl border border-white/5 p-5 hover:border-brand-500/30 transition-all duration-500 hover:scale-[1.02] ${filter === (stat.label.toLowerCase() === 'total runs' ? 'all' : stat.label.toLowerCase()) ? 'border-brand-500/30' : ''} ${mounted ? 'opacity-100' : 'opacity-0'}`}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-brand-500/10 to-transparent rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                <div className="relative flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                    <Icon className="w-5 h-5 text-white" />
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

        {/* Filter Pills */}
        <div className={`flex gap-2 mb-6 transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {['all', 'completed', 'running', 'failed'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 hover:scale-105 ${filter === status
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
          <div className={`text-center py-20 rounded-2xl bg-neutral-900/30 border border-white/5 transition-all duration-700 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
            <div className="w-20 h-20 rounded-2xl bg-neutral-800/50 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <Activity className="w-10 h-10 text-neutral-600" />
            </div>
            <p className="text-neutral-500 mb-2 font-medium">No runs found</p>
            <p className="text-neutral-600 text-sm mb-6">Execute a pipeline to see runs here</p>
            <Link href="/pipelines">
              <Button className="bg-brand-500 hover:bg-brand-600 hover:scale-105 transition-transform">
                View Pipelines
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredRuns.map((run: any, i: number) => {
              const statusConfig = getStatusConfig(run.status)
              const StatusIcon = statusConfig.icon
              const metrics = typeof run.metrics === 'string' ? JSON.parse(run.metrics) : run.metrics
              
              return (
                <div
                  key={run.id}
                  className={`group relative overflow-hidden rounded-2xl bg-neutral-900/50 backdrop-blur-xl border border-white/5 p-6 hover:border-brand-500/30 transition-all duration-300 hover:scale-[1.01] ${mounted ? 'opacity-100' : 'opacity-0'}`}
                  style={{ transitionDelay: `${i * 50}ms` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-brand-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-2xl ${statusConfig.bg} flex items-center justify-center border ${statusConfig.border} group-hover:scale-110 transition-transform duration-300`}>
                        <StatusIcon className={`w-7 h-7 ${statusConfig.color} ${run.status === 'running' ? 'animate-spin' : ''}`} />
                      </div>
                      <div>
                        <p className="font-bold text-white text-lg">Run #{run.id?.slice(0, 8)}</p>
                        <p className="text-neutral-400 text-sm flex items-center gap-2">
                          <Zap className="w-3 h-3 text-brand-400" />
                          {getPipelineName(run.pipeline_id)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Metrics */}
                      {metrics && (
                        <div className="flex gap-3">
                          {metrics.accuracy && (
                            <div className="text-center px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                              <p className="text-emerald-400 font-bold">{(metrics.accuracy * 100).toFixed(1)}%</p>
                              <p className="text-neutral-500 text-xs">Accuracy</p>
                            </div>
                          )}
                          {metrics.cost && (
                            <div className="text-center px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                              <p className="text-amber-400 font-bold">₹{metrics.cost.toFixed(2)}</p>
                              <p className="text-neutral-500 text-xs">Cost</p>
                            </div>
                          )}
                          {metrics.carbon && (
                            <div className="text-center px-3 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                              <p className="text-cyan-400 font-bold">{metrics.carbon.toFixed(3)}kg</p>
                              <p className="text-neutral-500 text-xs">Carbon</p>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <span className={`px-4 py-2 rounded-full text-xs font-bold ${statusConfig.bg} ${statusConfig.color} border ${statusConfig.border}`}>
                        {statusConfig.label}
                      </span>
                      
                      <Link href={`/runs/${run.id}`}>
                        <button className="p-2.5 rounded-xl bg-neutral-800/50 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all hover:scale-110">
                          <ArrowUpRight className="w-5 h-5" />
                        </button>
                      </Link>
                    </div>
                  </div>

                  {run.started_at && (
                    <div className="mt-5 pt-5 border-t border-white/5 flex gap-6 text-sm text-neutral-500">
                      <span className="flex items-center gap-2">
                        <Play className="w-4 h-4" />
                        Started: {new Date(run.started_at).toLocaleString()}
                      </span>
                      {run.completed_at && (
                        <span className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          Completed: {new Date(run.completed_at).toLocaleString()}
                        </span>
                      )}
                      {run.duration && (
                        <span className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          Duration: {Math.floor(run.duration / 60)}m {run.duration % 60}s
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
