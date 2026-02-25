import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { TrendingUp, AlertCircle, Zap, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function getData() {
  try {
    const [pipelinesRes, runsRes, activitiesRes, metricsRes, failuresRes] = await Promise.all([
      fetch(`${API_BASE}/api/pipelines`, { cache: 'no-store', next: { revalidate: 0 } }),
      fetch(`${API_BASE}/api/runs`, { cache: 'no-store', next: { revalidate: 0 } }),
      fetch(`${API_BASE}/api/activities`, { cache: 'no-store', next: { revalidate: 0 } }),
      fetch(`${API_BASE}/api/metrics`, { cache: 'no-store', next: { revalidate: 0 } }),
      fetch(`${API_BASE}/api/failures`, { cache: 'no-store', next: { revalidate: 0 } }),
    ])
    
    const pipelines = await pipelinesRes.json()
    const runs = await runsRes.json()
    const activities = await activitiesRes.json()
    const metrics = await metricsRes.json()
    const failures = await failuresRes.json()
    
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
      metrics: {},
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

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
            <p className="text-neutral-400">Overview of your ML pipelines and operations</p>
          </div>
          <Link href="/pipelines/new">
            <Button className="bg-brand-500 hover:bg-brand-600 text-white">
              Design New Pipeline
            </Button>
          </Link>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-brand-500/10 flex items-center justify-center">
                <Zap className="w-6 h-6 text-brand-500" />
              </div>
              <div>
                <p className="text-neutral-400 text-sm">Total Pipelines</p>
                <p className="text-2xl font-bold text-white">{totalPipelines}</p>
              </div>
            </div>
          </div>
          
          <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-success-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-success-500" />
              </div>
              <div>
                <p className="text-neutral-400 text-sm">Success Rate</p>
                <p className="text-2xl font-bold text-white">{successRate}%</p>
              </div>
            </div>
          </div>
          
          <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-danger-500/10 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-danger-500" />
              </div>
              <div>
                <p className="text-neutral-400 text-sm">Failures</p>
                <p className="text-2xl font-bold text-white">{unresolvedFailures}</p>
              </div>
            </div>
          </div>
          
          <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-info-500/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-info-500" />
              </div>
              <div>
                <p className="text-neutral-400 text-sm">Avg Accuracy</p>
                <p className="text-2xl font-bold text-white">{((metrics?.avg_accuracy || 0) * 100).toFixed(1)}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Activity Timeline */}
          <div className="lg:col-span-2">
            <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
              <h2 className="text-lg font-bold text-white mb-6">Recent Activity</h2>
              <div className="space-y-4">
                {activities.length === 0 ? (
                  <p className="text-neutral-500">No recent activity</p>
                ) : (
                  activities.slice(0, 6).map((activity: any, i: number) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-500/10 flex items-center justify-center flex-shrink-0">
                        <Zap className="w-4 h-4 text-brand-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-medium">{activity.title}</p>
                        <p className="text-neutral-500 text-sm">{activity.description}</p>
                      </div>
                      <span className="text-neutral-500 text-xs">
                        {new Date(activity.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="space-y-6">
            <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
              <h2 className="text-lg font-bold text-white mb-4">Pipeline Status</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-neutral-400">Active</span>
                  <span className="text-success-500 font-medium">{activePipelines}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-400">Designed</span>
                  <span className="text-brand-500 font-medium">{designedPipelines}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-400">Total Runs</span>
                  <span className="text-white font-medium">{runs.length}</span>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
              <h2 className="text-lg font-bold text-white mb-4">Average Metrics</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-neutral-400">Accuracy</span>
                  <span className="text-white font-medium">{((metrics?.avg_accuracy || 0) * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-400">Cost</span>
                  <span className="text-white font-medium">${(metrics?.avg_cost || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-400">Carbon</span>
                  <span className="text-white font-medium">{(metrics?.avg_carbon || 0).toFixed(3)} kg</span>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
              <h2 className="text-lg font-bold text-white mb-4">Quick Actions</h2>
              <div className="space-y-2">
                <Link href="/pipelines/new" className="block">
                  <Button variant="outline" className="w-full border-neutral-700 text-neutral-300 hover:bg-neutral-800">
                    Design Pipeline
                  </Button>
                </Link>
                <Link href="/pipelines" className="block">
                  <Button variant="outline" className="w-full border-neutral-700 text-neutral-300 hover:bg-neutral-800">
                    View Pipelines
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
