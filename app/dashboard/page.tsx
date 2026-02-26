'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { TerminalLayout } from '@/components/layout/terminal-layout'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://system2ml-api.onrender.com'

interface Activity {
  id: number
  title: string
  description: string
  created_at: string
}

interface Pipeline {
  id: number
  name: string
  status: string
}

interface Run {
  id: number
  pipeline_name: string
  status: string
}

interface Metrics {
  total_pipelines: number
  active_pipelines: number
  total_runs: number
  completed_runs: number
  avg_accuracy: number
  avg_cost: number
  avg_carbon: number
}

export default function DashboardPage() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [runs, setRuns] = useState<Run[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [metrics, setMetrics] = useState<Metrics>({
    total_pipelines: 0,
    active_pipelines: 0,
    total_runs: 0,
    completed_runs: 0,
    avg_accuracy: 0,
    avg_cost: 0,
    avg_carbon: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchData() {
      if (!API_BASE || API_BASE === '' || !API_BASE.startsWith('http')) {
        setLoading(false)
        return
      }

      try {
        const [pipelinesRes, runsRes, activitiesRes, metricsRes] = await Promise.all([
          fetch(`${API_BASE}/api/pipelines`, { cache: 'no-store' }).catch(() => null),
          fetch(`${API_BASE}/api/runs`, { cache: 'no-store' }).catch(() => null),
          fetch(`${API_BASE}/api/activities`, { cache: 'no-store' }).catch(() => null),
          fetch(`${API_BASE}/api/metrics`, { cache: 'no-store' }).catch(() => null),
        ])

        if (pipelinesRes?.ok) {
          const data = await pipelinesRes.json()
          setPipelines(data.pipelines || [])
        }
        if (runsRes?.ok) {
          const data = await runsRes.json()
          setRuns(data.runs || [])
        }
        if (activitiesRes?.ok) {
          const data = await activitiesRes.json()
          setActivities(data.activities || [])
        }
        if (metricsRes?.ok) {
          const data = await metricsRes.json()
          setMetrics(data)
        }
      } catch (e) {
        console.error('Error fetching data:', e)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const completedRuns = runs.filter((r) => r.status === 'completed').length
  const failedRuns = runs.filter((r) => r.status === 'failed').length
  const successRate = runs.length > 0 ? ((completedRuns / runs.length) * 100).toFixed(1) : '0'

  const stats = [
    { label: 'pipelines', value: pipelines.length, color: 'text-cyan-400' },
    { label: 'success_rate', value: `${successRate}%`, color: 'text-emerald-400' },
    { label: 'total_runs', value: runs.length, color: 'text-purple-400' },
    { label: 'avg_accuracy', value: `${((metrics.avg_accuracy || 0) * 100).toFixed(1)}%`, color: 'text-amber-400' },
  ]

  return (
    <TerminalLayout>
      <div className="space-y-6">
        {(!API_BASE || API_BASE === '') && (
          <div className="p-3 rounded bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm font-mono">
            <span className="text-yellow-500">$</span> warning: API not connected. Set NEXT_PUBLIC_API_URL.
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">
              <span className="text-cyan-400">$</span> ./dashboard.sh --welcome
            </h1>
            <p className="text-[#8b949e] text-sm mt-1 font-mono">
              monitoring ML pipeline operations
            </p>
          </div>
          <Link
            href="/design/input"
            className="px-4 py-2 bg-[#238636] hover:bg-[#2ea043] text-white text-sm rounded font-mono"
          >
            + design_pipeline
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <div
              key={i}
              className="bg-[#0d1117] border border-[#30363d] rounded p-4 hover:border-cyan-500/50 transition-colors"
            >
              <div className="text-xs text-[#8b949e] mb-1 font-mono">
                <span className="text-cyan-400">$</span> {stat.label}
              </div>
              <div className={`text-2xl font-bold ${stat.color} font-mono`}>
                {loading ? '...' : stat.value}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#0d1117] border border-[#30363d] rounded">
            <div className="bg-[#161b22] px-4 py-2 border-b border-[#30363d] flex items-center justify-between">
              <span className="text-sm text-[#8b949e] font-mono">
                <span className="text-cyan-400">$</span> recent_activities
              </span>
              <Link href="/runs" className="text-xs text-cyan-400 hover:underline">
                view_all
              </Link>
            </div>
            <div className="p-4 space-y-2">
              {loading ? (
                <div className="text-[#6e7681] text-sm font-mono animate-pulse">
                  loading...
                </div>
              ) : activities.length === 0 ? (
                <div className="text-[#6e7681] text-sm font-mono">
                  <span className="text-yellow-500">#</span> no recent activity
                </div>
              ) : (
                activities.slice(0, 5).map((activity, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-2 rounded hover:bg-[#161b22] transition-colors"
                  >
                    <span className="text-cyan-400">›</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm truncate">{activity.title}</div>
                      <div className="text-[#6e7681] text-xs truncate">
                        {activity.description}
                      </div>
                    </div>
                    <div className="text-[#6e7681] text-xs">
                      {new Date(activity.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-[#0d1117] border border-[#30363d] rounded">
            <div className="bg-[#161b22] px-4 py-2 border-b border-[#30363d]">
              <span className="text-sm text-[#8b949e] font-mono">
                <span className="text-cyan-400">$</span> pipeline_status
              </span>
            </div>
            <div className="p-4 space-y-4">
              {loading ? (
                <div className="text-[#6e7681] text-sm font-mono animate-pulse">
                  loading...
                </div>
              ) : (
                <>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-[#8b949e]">active</span>
                      <span className="text-emerald-400">
                        {pipelines.filter((p) => p.status === 'active').length}
                      </span>
                    </div>
                    <div className="h-2 bg-[#30363d] rounded overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded transition-all duration-500"
                        style={{
                          width: `${(pipelines.filter((p) => p.status === 'active').length / Math.max(pipelines.length, 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-[#8b949e]">completed</span>
                      <span className="text-cyan-400">{completedRuns}</span>
                    </div>
                    <div className="h-2 bg-[#30363d] rounded overflow-hidden">
                      <div
                        className="h-full bg-cyan-500 rounded transition-all duration-500"
                        style={{
                          width: `${(completedRuns / Math.max(runs.length, 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-[#8b949e]">failed</span>
                      <span className="text-red-400">{failedRuns}</span>
                    </div>
                    <div className="h-2 bg-[#30363d] rounded overflow-hidden">
                      <div
                        className="h-full bg-red-500 rounded transition-all duration-500"
                        style={{
                          width: `${(failedRuns / Math.max(runs.length, 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="bg-[#0d1117] border border-[#30363d] rounded">
          <div className="bg-[#161b22] px-4 py-2 border-b border-[#30363d]">
            <span className="text-sm text-[#8b949e] font-mono">
              <span className="text-cyan-400">$</span> quick_actions
            </span>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <Link
              href="/datasets/new"
              className="p-3 bg-[#161b22] border border-[#30363d] rounded hover:border-cyan-500/50 transition-colors text-center"
            >
              <span className="text-cyan-400">+</span>
              <span className="text-white text-sm ml-2">upload_dataset</span>
            </Link>
            <Link
              href="/design/input"
              className="p-3 bg-[#161b22] border border-[#30363d] rounded hover:border-cyan-500/50 transition-colors text-center"
            >
              <span className="text-cyan-400">∼</span>
              <span className="text-white text-sm ml-2">design_pipeline</span>
            </Link>
            <Link
              href="/pipelines"
              className="p-3 bg-[#161b22] border border-[#30363d] rounded hover:border-cyan-500/50 transition-colors text-center"
            >
              <span className="text-cyan-400">⇥</span>
              <span className="text-white text-sm ml-2">view_pipelines</span>
            </Link>
          </div>
        </div>
      </div>
    </TerminalLayout>
  )
}
