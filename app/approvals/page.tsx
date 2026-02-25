'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { fetchActivities, fetchPipelines } from '@/lib/api'
import { Loader2, CheckCircle, Clock, AlertCircle } from 'lucide-react'

export default function ApprovalsPage() {
  const [activities, setActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const data = await fetchActivities()
        setActivities(data)
      } catch (e) {
        console.error('Error loading data:', e)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  return (
    <DashboardLayout>
      <div className="p-8">
        <h1 className="text-3xl font-bold text-white mb-2">Approvals</h1>
        <p className="text-neutral-400 mb-8">Manage pipeline approvals and deployments</p>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-12 text-neutral-500">
            No pending approvals.
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity: any, i: number) => (
              <div key={i} className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-brand-500" />
                    <div>
                      <p className="font-medium text-white">{activity.title}</p>
                      <p className="text-sm text-neutral-400">{activity.description}</p>
                    </div>
                  </div>
                  <span className="text-xs text-neutral-500">
                    {new Date(activity.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
