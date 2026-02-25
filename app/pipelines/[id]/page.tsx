import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { PipelineDesigner } from '@/components/pipelines/pipeline-designer'
import { fetchPipelineById, fetchPipelineRuns } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { ArrowLeft, Play, BookOpen } from 'lucide-react'
import { notFound } from 'next/navigation'

export default async function PipelineDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const pipeline = await fetchPipelineById(params.id)

  if (!pipeline) {
    notFound()
  }

  const runs = await fetchPipelineRuns(pipeline.id)
  const latestRun = runs[0]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-success-500/10 text-success-600'
      case 'failed':
        return 'bg-danger-500/10 text-danger-600'
      case 'running':
        return 'bg-info-500/10 text-info-600'
      default:
        return 'bg-neutral-600/10 text-neutral-400'
    }
  }

  return (
    <DashboardLayout>
      <div className="p-8 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/pipelines"
            className="flex items-center gap-2 text-neutral-400 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Pipelines
          </Link>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">{pipeline.name}</h1>
              <p className="text-neutral-400">{pipeline.description}</p>
            </div>
            <div className="flex gap-3">
              {pipeline.status === 'draft' && (
                <Button className="bg-brand-500 hover:bg-brand-600 text-white gap-2">
                  <Play className="w-4 h-4" />
                  Deploy
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
            <Badge className={getStatusColor(pipeline.status || 'draft')}>
              {((pipeline.status) || 'draft').charAt(0).toUpperCase() + (pipeline.status || 'draft').slice(1)}
            </Badge>
            <span className="text-neutral-400">v{pipeline.version}</span>
            {latestRun && (
              <>
                <span className="text-neutral-400">Last run:</span>
                <Badge className={getStatusColor(latestRun.status)}>
                  {latestRun.status.charAt(0).toUpperCase() + latestRun.status.slice(1)}
                </Badge>
              </>
            )}
          </div>
        </div>

        {/* Designer Canvas */}
        <div className="flex-1 min-h-0">
          <PipelineDesigner pipeline={pipeline} />
        </div>
      </div>
    </DashboardLayout>
  )
}
