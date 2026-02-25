'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { fetchPipelines, fetchActivities } from '@/lib/api'
import { Loader2, Lightbulb, TrendingUp, Zap } from 'lucide-react'

export default function DesignAgentPage() {
  const [pipelines, setPipelines] = useState<any[]>([])
  const [activities, setActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const [pipelinesData, activitiesData] = await Promise.all([
          fetchPipelines(),
          fetchActivities()
        ])
        setPipelines(pipelinesData)
        setActivities(activitiesData)
      } catch (e) {
        console.error('Error loading data:', e)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const proposals = activities.filter((a: any) => a.type === 'pipeline' || a.title?.includes('design'))

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">AI Design Agent</h1>
          <p className="text-neutral-400">Intelligent pipeline optimization suggestions</p>
        </div>

        <div className="flex gap-4 mb-8">
          <Button className="bg-brand-500 hover:bg-brand-600 text-white gap-2">
            <Zap className="w-4 h-4" />
            Generate New Proposal
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
          </div>
        ) : proposals.length === 0 ? (
          <div className="text-center py-12 text-neutral-500">
            No design proposals yet. Create a pipeline to get started.
          </div>
        ) : (
          <div className="space-y-4">
            {proposals.map((proposal: any, i: number) => (
              <div key={i} className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
                <div className="flex items-start gap-3">
                  <Lightbulb className="w-6 h-6 text-brand-500 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white">{proposal.title}</h3>
                    <p className="text-neutral-400">{proposal.description}</p>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" className="bg-success-600 hover:bg-success-700 text-white">
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" className="border-neutral-700 text-neutral-300">
                        Dismiss
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
