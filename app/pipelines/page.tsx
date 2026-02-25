'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { fetchPipelines } from '@/lib/api'
import { Loader2, Plus, Search } from 'lucide-react'
import Link from 'next/link'

export default function PipelinesPage() {
  const [pipelines, setPipelines] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function loadPipelines() {
      try {
        const data = await fetchPipelines()
        setPipelines(data)
      } catch (e) {
        console.error('Error loading pipelines:', e)
      } finally {
        setLoading(false)
      }
    }
    loadPipelines()
  }, [])

  const filtered = pipelines.filter(p => 
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.data_type?.toLowerCase().includes(search.toLowerCase())
  )

  const activePipelines = pipelines.filter(p => p.status === 'active').length
  const designedPipelines = pipelines.filter(p => p.status === 'designed').length

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Pipelines</h1>
            <p className="text-neutral-400">Manage and monitor your ML pipelines</p>
          </div>
          <Link href="/pipelines/new">
            <Button className="bg-brand-500 hover:bg-brand-600 text-white gap-2">
              <Plus className="w-4 h-4" />
              New Pipeline
            </Button>
          </Link>
        </div>

        <div className="flex gap-4 mb-8">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input
                type="text"
                placeholder="Search pipelines..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
            <p className="text-neutral-400 text-sm">Total</p>
            <p className="text-2xl font-bold text-white">{pipelines.length}</p>
          </div>
          <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
            <p className="text-neutral-400 text-sm">Active</p>
            <p className="text-2xl font-bold text-success-500">{activePipelines}</p>
          </div>
          <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
            <p className="text-neutral-400 text-sm">Designed</p>
            <p className="text-2xl font-bold text-brand-500">{designedPipelines}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-neutral-500 mb-4">No pipelines found</p>
            <Link href="/pipelines/new">
              <Button className="bg-brand-500 hover:bg-brand-600 text-white">
                Create Your First Pipeline
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {filtered.map((pipeline: any) => (
              <div key={pipeline.id} className="rounded-lg border border-neutral-800 bg-neutral-900 p-6 hover:border-neutral-700 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white">{pipeline.name}</h3>
                    <p className="text-neutral-400 text-sm">{pipeline.data_type} - {pipeline.objective}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      pipeline.status === 'active' ? 'bg-success-500/10 text-success-500' :
                      pipeline.status === 'designed' ? 'bg-brand-500/10 text-brand-500' :
                      'bg-neutral-700 text-neutral-400'
                    }`}>
                      {pipeline.status || 'draft'}
                    </span>
                    <Link href={`/pipelines/${pipeline.id}`}>
                      <Button variant="outline" size="sm" className="border-neutral-700 text-neutral-300 hover:bg-neutral-800">
                        View
                      </Button>
                    </Link>
                  </div>
                </div>
                <div className="mt-4 flex gap-4 text-sm text-neutral-400">
                  <span>Deployment: {pipeline.deployment}</span>
                  <span>Retraining: {pipeline.retraining}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
