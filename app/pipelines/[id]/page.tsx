'use client'

import { useState, useEffect, use } from 'react'
import dynamic from 'next/dynamic'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { PipelineNode, PipelineEdge } from '@/components/pipelines/pipeline-designer'
import { fetchPipelineById, fetchPipelineRuns, executePipeline } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { ArrowLeft, Play, BookOpen, Loader2, Save } from 'lucide-react'

const PipelineDesigner = dynamic(
  () => import('@/components/pipelines/pipeline-designer').then(mod => ({ default: mod.PipelineDesigner })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full gap-6">
        <div className="flex-1 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4">
          <div className="flex items-center justify-center h-full text-neutral-500">
            Loading pipeline designer...
          </div>
        </div>
      </div>
    )
  }
)

interface PipelinePageProps {
  params: Promise<{ id: string }>
}

export default function PipelineDetailPage({ params }: PipelinePageProps) {
  const { id } = use(params)

  const [pipeline, setPipeline] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [nodes, setNodes] = useState<PipelineNode[]>([])
  const [edges, setEdges] = useState<PipelineEdge[]>([])
  const [latestRun, setLatestRun] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [deploying, setDeploying] = useState(false)

  useEffect(() => {
    async function loadData() {
      try {
        const data = await fetchPipelineById(id)
        setPipeline(data.pipeline)

        if (data.pipeline?.designs?.length > 0) {
          const design = data.pipeline.designs[0]
          if (design.pipeline) {
            setNodes(design.pipeline.nodes || [])
            setEdges(design.pipeline.edges || [])
          }
        }

        const runsData = await fetchPipelineRuns(id)
        setLatestRun(runsData[0])
      } catch (e) {
        console.error('Error loading pipeline:', e)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [id])

  const handleSavePipeline = async (newNodes: PipelineNode[], newEdges: PipelineEdge[]) => {
    setSaving(true)
    try {
      // In a real app, you'd save to backend
      console.log('Saving pipeline:', { nodes: newNodes, edges: newEdges })
      setNodes(newNodes)
      setEdges(newEdges)
      await new Promise(resolve => setTimeout(resolve, 1000))
    } finally {
      setSaving(false)
    }
  }

  const handleDeploy = async () => {
    setDeploying(true)
    try {
      const result = await executePipeline(id)
      if (result.error) {
        console.error('Deployment error:', result.error)
        return
      }

      // Update pipeline status locally
      setPipeline((prev: any) => ({ ...prev, status: 'active' }))

      // Refresh runs
      const runsData = await fetchPipelineRuns(id)
      setLatestRun(runsData[0])
    } catch (e) {
      console.error('Error deploying pipeline:', e)
    } finally {
      setDeploying(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
      case 'designed':
        return 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
      case 'running':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
      case 'failed':
        return 'bg-red-500/10 text-red-400 border border-red-500/20'
      default:
        return 'bg-neutral-700/10 text-neutral-400 border border-neutral-700/20'
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
        </div>
      </DashboardLayout>
    )
  }

  if (!pipeline) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-screen">
          <p className="text-neutral-500 mb-4">Pipeline not found</p>
          <Link href="/pipelines">
            <Button>Back to Pipelines</Button>
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-8 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <div className="mb-6 flex-shrink-0">
          <Link
            href="/pipelines"
            className="flex items-center gap-2 text-neutral-400 hover:text-white mb-4 transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Pipelines
          </Link>

          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-white">{pipeline.name}</h1>
                <Badge className={getStatusColor(pipeline.status || 'draft')}>
                  {(pipeline.status || 'draft').charAt(0).toUpperCase() + (pipeline.status || 'draft').slice(1)}
                </Badge>
              </div>
              <p className="text-neutral-400">{pipeline.description || 'Custom ML Pipeline'}</p>
            </div>
            <div className="flex gap-3">
              {pipeline.status === 'designed' && (
                <Button
                  onClick={handleDeploy}
                  disabled={deploying}
                  className="bg-brand-500 hover:bg-brand-600 text-white gap-2"
                >
                  {deploying ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  {deploying ? 'Deploying...' : 'Deploy'}
                </Button>
              )}
              <Button
                variant="outline"
                className="border-neutral-700 text-neutral-300 hover:bg-neutral-800"
              >
                <BookOpen className="w-4 h-4 mr-2" />
                Docs
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-4 text-sm">
            <span className="text-neutral-500">v{pipeline.version || '1.0'}</span>
            {latestRun && (
              <>
                <span className="text-neutral-600">•</span>
                <span className="text-neutral-400">Last run:</span>
                <Badge className={getStatusColor(latestRun.status)}>
                  {latestRun.status}
                </Badge>
              </>
            )}
            {pipeline.constraints && (
              <>
                <span className="text-neutral-600">•</span>
                <span className="text-neutral-400">
                  Budget: ${pipeline.constraints.max_cost_usd}
                </span>
                <span className="text-neutral-600">|</span>
                <span className="text-neutral-400">
                  Carbon: {pipeline.constraints.max_carbon_kg}kg
                </span>
              </>
            )}
          </div>
        </div>

        {/* Designer Canvas */}
        <div className="flex-1 min-h-0 pb-6">
          <PipelineDesigner
            initialNodes={nodes}
            initialEdges={edges}
            onSave={handleSavePipeline}
          />
        </div>
      </div>
    </DashboardLayout>
  )
}
