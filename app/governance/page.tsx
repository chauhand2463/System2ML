'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { fetchActivities, fetchPipelines } from '@/lib/api'
import { Loader2, Shield, Activity, FileText, CheckCircle, Clock, ArrowRight, Zap } from 'lucide-react'

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

  const stats = [
    { 
      label: 'Compliance Status', 
      value: 'Active', 
      icon: Shield, 
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10'
    },
    { 
      label: 'Audit Events', 
      value: activities.length, 
      icon: FileText, 
      color: 'text-brand-400',
      bg: 'bg-brand-500/10'
    },
    { 
      label: 'Policies', 
      value: '5 Active', 
      icon: CheckCircle, 
      color: 'text-purple-400',
      bg: 'bg-purple-500/10'
    },
  ]

  return (
    <DashboardLayout>
      <div className="p-8 min-h-screen">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Governance</h1>
          <p className="text-neutral-400">Audit logs, compliance tracking, and policy management</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {stats.map((stat, i) => {
            const Icon = stat.icon
            return (
              <div 
                key={i}
                className="relative group overflow-hidden rounded-2xl bg-neutral-900/50 backdrop-blur-xl border border-white/5 p-6 hover:border-brand-500/30 transition-all duration-500"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                  </div>
                  <p className="text-neutral-400 text-sm">{stat.label}</p>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Policies Section */}
        <div className="rounded-2xl bg-neutral-900/50 backdrop-blur-xl border border-white/5 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white">Active Policies</h2>
            <button className="text-brand-400 text-sm hover:text-brand-300 flex items-center gap-1">
              View all <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3">
            {[
              { name: 'Data Privacy Compliance', status: 'active', type: 'GDPR' },
              { name: 'Model Fairness Check', status: 'active', type: 'Fairness' },
              { name: 'Cost Budget Enforcement', status: 'active', type: 'Budget' },
              { name: 'Carbon Footprint Limits', status: 'active', type: 'Environmental' },
            ].map((policy, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-neutral-800/30 border border-white/5">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="font-medium text-white">{policy.name}</p>
                    <p className="text-xs text-neutral-500">{policy.type} Policy</p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400">
                  {policy.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Audit Log */}
        <div className="rounded-2xl bg-neutral-900/50 backdrop-blur-xl border border-white/5 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white">Recent Audit Events</h2>
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
            <div className="space-y-3">
              {activities.slice(0, 5).map((activity: any, i: number) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-neutral-800/30 border border-white/5">
                  <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-brand-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-white">{activity.title}</p>
                    <p className="text-xs text-neutral-500">{activity.description}</p>
                  </div>
                  <span className="text-xs text-neutral-500">
                    {new Date(activity.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
