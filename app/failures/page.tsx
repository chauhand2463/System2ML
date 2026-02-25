'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { fetchFailures, fetchPipelines } from '@/lib/api'
import { AlertCircle, Loader2, CheckCircle, Clock, ArrowRight, Zap } from 'lucide-react'

export default function FailuresPage() {
  const [failures, setFailures] = useState<any[]>([])
  const [pipelines, setPipelines] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

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

  const filteredFailures = filter === 'all' 
    ? failures 
    : filter === 'open' 
      ? failures.filter(f => !f.is_resolved)
      : failures.filter(f => f.is_resolved)

  const getPipelineName = (pipelineId: string) => {
    const pipeline = pipelines.find(p => p.id === pipelineId)
    return pipeline?.name || pipelineId
  }

  const stats = [
    { label: 'Total', value: failures.length, color: 'from-neutral-500 to-neutral-600' },
    { label: 'Open', value: failures.filter(f => !f.is_resolved).length, color: 'from-red-500 to-red-600' },
    { label: 'Resolved', value: failures.filter(f => f.is_resolved).length, color: 'from-emerald-500 to-emerald-600' },
  ]

  return (
    <DashboardLayout>
      <div className="p-8 min-h-screen">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Failures</h1>
          <p className="text-neutral-400">Track and resolve pipeline failures</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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
          {['all', 'open', 'resolved'].map((status) => (
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
        ) : filteredFailures.length === 0 ? (
          <div className="text-center py-20 rounded-2xl bg-neutral-900/30 border border-white/5">
            <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-emerald-500" />
            </div>
            <p className="text-neutral-500 mb-2">
              {filter === 'all' ? 'No failures recorded' : `No ${filter} failures`}
            </p>
            <p className="text-neutral-600 text-sm">Great job keeping things running smoothly!</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredFailures.map((failure: any) => (
              <div 
                key={failure.id} 
                className="group relative overflow-hidden rounded-2xl bg-neutral-900/50 backdrop-blur-xl border border-white/5 p-6 hover:border-red-500/30 transition-all duration-300"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="relative flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      failure.is_resolved 
                        ? 'bg-emerald-500/10' 
                        : 'bg-red-500/10'
                    }`}>
                      {failure.is_resolved ? (
                        <CheckCircle className="w-6 h-6 text-emerald-400" />
                      ) : (
                        <AlertCircle className="w-6 h-6 text-red-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-white">{failure.error_type}</p>
                      <p className="text-neutral-400 text-sm mt-1">{failure.error_message}</p>
                      <p className="text-neutral-600 text-xs mt-2 flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        Pipeline: {getPipelineName(failure.pipeline_id)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className={`px-4 py-1.5 rounded-full text-xs font-semibold ${
                      failure.is_resolved 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                      {failure.is_resolved ? 'Resolved' : 'Open'}
                    </span>
                  </div>
                </div>
                
                {failure.suggested_fix && !failure.is_resolved && (
                  <div className="mt-4 pt-4 border-t border-white/5">
                    <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10">
                      <p className="text-xs font-semibold text-red-400 mb-1">Suggested Fix</p>
                      <p className="text-sm text-neutral-300">{failure.suggested_fix}</p>
                    </div>
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
