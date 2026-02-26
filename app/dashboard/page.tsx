import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { TrendingUp, AlertCircle, Zap, CheckCircle2, Activity, ArrowUpRight, Play, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://system2ml-api.onrender.com'

async function getData() {
  // Return mock data if no API configured
  if (!API_BASE || API_BASE === '' || !API_BASE.startsWith('http')) {
    return {
      pipelines: [],
      runs: [],
      activities: [],
      metrics: { total_pipelines: 0, active_pipelines: 0, total_runs: 0, completed_runs: 0, avg_accuracy: 0, avg_cost: 0, avg_carbon: 0 },
      failures: [],
    }
  }

  try {
    const [pipelinesRes, runsRes, activitiesRes, metricsRes, failuresRes] = await Promise.all([
      fetch(`${API_BASE}/api/pipelines`, { cache: 'no-store', next: { revalidate: 0 } }).catch(() => null),
      fetch(`${API_BASE}/api/runs`, { cache: 'no-store', next: { revalidate: 0 } }).catch(() => null),
      fetch(`${API_BASE}/api/activities`, { cache: 'no-store', next: { revalidate: 0 } }).catch(() => null),
      fetch(`${API_BASE}/api/metrics`, { cache: 'no-store', next: { revalidate: 0 } }).catch(() => null),
      fetch(`${API_BASE}/api/failures`, { cache: 'no-store', next: { revalidate: 0 } }).catch(() => null),
    ])
    
    const pipelines = pipelinesRes?.ok ? await pipelinesRes.json() : { pipelines: [] }
    const runs = runsRes?.ok ? await runsRes.json() : { runs: [] }
    const activities = activitiesRes?.ok ? await activitiesRes.json() : { activities: [] }
    const metrics = metricsRes?.ok ? await metricsRes.json() : { total_pipelines: 0, active_pipelines: 0, total_runs: 0, completed_runs: 0, avg_accuracy: 0, avg_cost: 0, avg_carbon: 0 }
    const failures = failuresRes?.ok ? await failuresRes.json() : { failures: [] }
    
    return {
      pipelines: pipelines.pipelines || [],
      runs: runs.runs || [],
      activities: activities.activities || [],
      metrics: metrics,
      failures: failures.failures || [],
    }
  } catch (e) {
    console.error('Error fetching data:', e)
    return {
      pipelines: [],
      runs: [],
      activities: [],
      metrics: { total_pipelines: 0, active_pipelines: 0, total_runs: 0, completed_runs: 0, avg_accuracy: 0, avg_cost: 0, avg_carbon: 0 },
      failures: [],
    }
  }
}

export default async function DashboardPage() {
  const { pipelines, runs, activities, metrics, failures } = await getData()

  const activePipelines = pipelines.filter((p: any) => p.status === 'active').length
  const designedPipelines = pipelines.filter((p: any) => p.status === 'designed').length
  const totalPipelines = pipelines.length
  const completedRuns = runs.filter((r: any) => r.status === 'completed').length
  const failedRuns = runs.filter((r: any) => r.status === 'failed').length
  const unresolvedFailures = failures.filter((f: any) => !f.is_resolved).length
  const successRate = runs.length > 0 ? ((completedRuns / runs.length) * 100).toFixed(1) : "0"

  const stats = [
    { 
      label: 'Total Pipelines', 
      value: totalPipelines, 
      icon: Zap, 
      color: 'from-brand-500 to-brand-600',
      bgColor: 'bg-brand-500/10',
      textColor: 'text-brand-400',
      change: '+12%',
      trend: 'up'
    },
    { 
      label: 'Success Rate', 
      value: `${successRate}%`, 
      icon: CheckCircle2, 
      color: 'from-emerald-500 to-emerald-600',
      bgColor: 'bg-emerald-500/10',
      textColor: 'text-emerald-400',
      change: '+5%',
      trend: 'up'
    },
    { 
      label: 'Active Failures', 
      value: unresolvedFailures, 
      icon: AlertCircle, 
      color: 'from-red-500 to-red-600',
      bgColor: 'bg-red-500/10',
      textColor: 'text-red-400',
      change: '-3%',
      trend: 'down'
    },
    { 
      label: 'Avg Accuracy', 
      value: `${((metrics?.avg_accuracy || 0) * 100).toFixed(1)}%`, 
      icon: TrendingUp, 
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-500/10',
      textColor: 'text-purple-400',
      change: '+8%',
      trend: 'up'
    },
  ]

  return (
    <DashboardLayout>
      <div className="p-8 min-h-screen">
        {/* API Not Configured Banner */}
        {(!API_BASE || API_BASE === '') && (
          <div className="mb-6 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-400" />
              <div>
                <p className="text-yellow-400 font-medium">Backend API Not Connected</p>
                <p className="text-yellow-400/70 text-sm">
                  Set NEXT_PUBLIC_API_URL environment variable to connect to your backend.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Welcome back</h1>
            <p className="text-neutral-400">Here's what's happening with your ML pipelines</p>
          </div>
          <Link href="/pipelines/new">
            <Button className="bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-400 hover:to-brand-500 text-white shadow-lg shadow-brand-500/25">
              <Play className="w-4 h-4 mr-2" />
              Design New Pipeline
            </Button>
          </Link>
        </div>

        {/* Stats Grid */}
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
                    <div className={`flex items-center gap-1 text-xs font-medium ${stat.trend === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {stat.change}
                      <ArrowUpRight className="w-3 h-3" />
                    </div>
                  </div>
                  <p className="text-neutral-400 text-sm mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold text-white">{stat.value}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Activity */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl bg-neutral-900/50 backdrop-blur-xl border border-white/5 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-white">Recent Activity</h2>
                <Link href="/runs" className="text-sm text-brand-400 hover:text-brand-300 flex items-center gap-1">
                  View all <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>
              
              <div className="space-y-4">
                {activities.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-2xl bg-neutral-800/50 flex items-center justify-center mx-auto mb-4">
                      <Activity className="w-8 h-8 text-neutral-600" />
                    </div>
                    <p className="text-neutral-500">No recent activity</p>
                    <Link href="/pipelines/new">
                      <Button variant="outline" className="mt-4 border-neutral-700">
                        Create your first pipeline
                      </Button>
                    </Link>
                  </div>
                ) : (
                  activities.slice(0, 5).map((activity: any, i: number) => (
                    <div 
                      key={i} 
                      className="flex items-center gap-4 p-4 rounded-xl bg-neutral-800/30 hover:bg-neutral-800/50 border border-white/5 transition-all duration-300 group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                        <Zap className="w-5 h-5 text-brand-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{activity.title}</p>
                        <p className="text-neutral-500 text-sm truncate">{activity.description}</p>
                      </div>
                      <div className="flex items-center gap-1 text-neutral-500 text-xs">
                        <Clock className="w-3 h-3" />
                        {new Date(activity.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Pipeline Status */}
            <div className="rounded-2xl bg-neutral-900/50 backdrop-blur-xl border border-white/5 p-6">
              <h2 className="text-lg font-bold text-white mb-4">Pipeline Status</h2>
              <div className="space-y-4">
                {[
                  { label: 'Active', value: activePipelines, color: 'bg-emerald-500', width: `${(activePipelines / Math.max(totalPipelines, 1)) * 100}%` },
                  { label: 'Designed', value: designedPipelines, color: 'bg-brand-500', width: `${(designedPipelines / Math.max(totalPipelines, 1)) * 100}%` },
                  { label: 'Total Runs', value: runs.length, color: 'bg-purple-500', width: '100%' },
                ].map((item, i) => (
                  <div key={i}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-neutral-400 text-sm">{item.label}</span>
                      <span className="text-white font-semibold">{item.value}</span>
                    </div>
                    <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${item.color} rounded-full transition-all duration-1000`} 
                        style={{ width: item.width }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Metrics */}
            <div className="rounded-2xl bg-neutral-900/50 backdrop-blur-xl border border-white/5 p-6">
              <h2 className="text-lg font-bold text-white mb-4">Average Metrics</h2>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Accuracy', value: `${((metrics?.avg_accuracy || 0) * 100).toFixed(1)}%`, color: 'text-emerald-400' },
                  { label: 'Cost', value: `$${(metrics?.avg_cost || 0).toFixed(2)}`, color: 'text-amber-400' },
                  { label: 'Carbon', value: `${(metrics?.avg_carbon || 0).toFixed(3)}kg`, color: 'text-cyan-400' },
                  { label: 'Latency', value: `${(metrics?.avg_latency || 0).toFixed(0)}ms`, color: 'text-purple-400' },
                ].map((metric, i) => (
                  <div key={i} className="p-4 rounded-xl bg-neutral-800/30 border border-white/5">
                    <p className="text-neutral-500 text-xs mb-1">{metric.label}</p>
                    <p className={`text-xl font-bold ${metric.color}`}>{metric.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="rounded-2xl bg-gradient-to-br from-brand-500/10 to-purple-500/10 border border-brand-500/20 p-6">
              <h2 className="text-lg font-bold text-white mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <Link href="/pipelines/new" className="block">
                  <Button className="w-full bg-brand-500 hover:bg-brand-600 justify-start gap-2">
                    <Zap className="w-4 h-4" />
                    Design Pipeline
                  </Button>
                </Link>
                <Link href="/design-agent" className="block">
                  <Button variant="outline" className="w-full border-neutral-700 justify-start gap-2">
                    <Activity className="w-4 h-4" />
                    AI Design Agent
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
