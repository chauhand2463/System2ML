'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { fetchActivities, fetchPipelines } from '@/lib/api'
import { Loader2, CheckCircle, Clock, AlertCircle, ArrowRight, Zap, Shield, User } from 'lucide-react'

export default function ApprovalsPage() {
  const [activities, setActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')

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

  const pendingApprovals = activities.filter((a: any) => !a.is_resolved)
  const approvedApprovals = activities.filter((a: any) => a.is_resolved)

  const filteredItems = filter === 'pending' ? pendingApprovals : approvedApprovals

  return (
    <DashboardLayout>
      <div className="p-8 min-h-screen">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Approvals</h1>
          <p className="text-neutral-400">Manage pipeline approvals and deployments</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="relative overflow-hidden rounded-2xl bg-neutral-900/50 backdrop-blur-xl border border-white/5 p-5">
            <div className="relative">
              <p className="text-neutral-400 text-sm mb-1">Pending</p>
              <p className="text-2xl font-bold text-white">{pendingApprovals.length}</p>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-2xl bg-neutral-900/50 backdrop-blur-xl border border-white/5 p-5">
            <div className="relative">
              <p className="text-neutral-400 text-sm mb-1">Approved</p>
              <p className="text-2xl font-bold text-white">{approvedApprovals.length}</p>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-2xl bg-neutral-900/50 backdrop-blur-xl border border-white/5 p-5">
            <div className="relative">
              <p className="text-neutral-400 text-sm mb-1">Total</p>
              <p className="text-2xl font-bold text-white">{activities.length}</p>
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 mb-6">
          {['pending', 'approved'].map((status) => (
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
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-20 rounded-2xl bg-neutral-900/30 border border-white/5">
            <div className="w-20 h-20 rounded-2xl bg-brand-500/10 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-10 h-10 text-brand-500" />
            </div>
            <p className="text-neutral-500 mb-2">No {filter} approvals</p>
            <p className="text-neutral-600 text-sm">
              {filter === 'pending' ? 'All caught up! No approvals waiting.' : 'No approved items yet.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredItems.map((activity: any, i: number) => (
              <div 
                key={i} 
                className="group relative overflow-hidden rounded-2xl bg-neutral-900/50 backdrop-blur-xl border border-white/5 p-6 hover:border-brand-500/30 transition-all duration-300"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-brand-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      activity.is_resolved 
                        ? 'bg-emerald-500/10' 
                        : 'bg-brand-500/10'
                    }`}>
                      {activity.is_resolved ? (
                        <CheckCircle className="w-6 h-6 text-emerald-400" />
                      ) : (
                        <Clock className="w-6 h-6 text-brand-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-white">{activity.title}</p>
                      <p className="text-neutral-400 text-sm mt-1">{activity.description}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className={`px-4 py-1.5 rounded-full text-xs font-semibold ${
                      activity.is_resolved 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
                    }`}>
                      {activity.is_resolved ? 'Approved' : 'Pending'}
                    </span>
                    <span className="text-neutral-500 text-xs">
                      {new Date(activity.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {!activity.is_resolved && (
                  <div className="mt-4 pt-4 border-t border-white/5 flex gap-3">
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" className="border-neutral-700 gap-1">
                      <ArrowRight className="w-3 h-3" />
                      Review
                    </Button>
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
