'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { fetchActivities, fetchPipelines } from '@/lib/api'
import { Loader2, Shield, Activity } from 'lucide-react'

export default function GovernancePage() {
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
        <h1 className="text-3xl font-bold text-white mb-2">Governance</h1>
        <p className="text-neutral-400 mb-8">Audit logs and compliance tracking</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-brand-500" />
              <div>
                <p className="text-neutral-400 text-sm">Compliance Status</p>
                <p className="text-2xl font-bold text-success-500">Active</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-info-500" />
              <div>
                <p className="text-neutral-400 text-sm">Audit Events</p>
                <p className="text-2xl font-bold text-white">{activities.length}</p>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-12 text-neutral-500">
            No audit events yet.
          </div>
        ) : (
          <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
            <h2 className="text-lg font-bold text-white mb-4">Recent Audit Events</h2>
            <div className="space-y-3">
              {activities.map((event: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 rounded bg-neutral-800">
                  <div>
                    <p className="font-medium text-white">{event.title}</p>
                    <p className="text-sm text-neutral-400">{event.description}</p>
                  </div>
                  <span className="text-xs text-neutral-500">
                    {new Date(event.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
