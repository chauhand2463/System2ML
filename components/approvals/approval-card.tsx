'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { CheckCircle2, XCircle, Clock, User } from 'lucide-react'

interface ApprovalStep {
  role: string
  status: 'pending' | 'approved' | 'rejected'
  approvedBy?: string
  approvedAt?: string
  comment?: string
}

interface ApprovalCardProps {
  id: string
  title: string
  description: string
  requestedBy: string
  requestedAt: string
  status: 'pending' | 'approved' | 'rejected'
  priority: 'low' | 'medium' | 'high' | 'critical'
  approvalSteps: ApprovalStep[]
  onApprove?: () => void
  onReject?: () => void
}

const priorityColors = {
  low: 'bg-info-500/20 text-info-400 border-info-500/30',
  medium: 'bg-warning-500/20 text-warning-400 border-warning-500/30',
  high: 'bg-danger-500/20 text-danger-400 border-danger-500/30',
  critical: 'bg-danger-600/20 text-danger-300 border-danger-600/30',
}

const statusIcons = {
  pending: Clock,
  approved: CheckCircle2,
  rejected: XCircle,
}

export function ApprovalCard({
  id,
  title,
  description,
  requestedBy,
  requestedAt,
  status,
  priority,
  approvalSteps,
  onApprove,
  onReject,
}: ApprovalCardProps) {
  const StatusIcon = statusIcons[status]
  const statusColor =
    status === 'approved'
      ? 'text-success-500'
      : status === 'rejected'
        ? 'text-danger-500'
        : 'text-warning-500'

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 overflow-hidden hover:border-neutral-700 transition-colors">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <StatusIcon className={`w-5 h-5 ${statusColor}`} />
              <h3 className="font-bold text-white text-lg">{title}</h3>
              <Badge className={priorityColors[priority]}>
                {priority.toUpperCase()}
              </Badge>
            </div>
            <p className="text-sm text-neutral-400">{description}</p>
          </div>
        </div>

        {/* Meta Info */}
        <div className="flex items-center gap-4 mb-6 text-sm text-neutral-400">
          <div className="flex items-center gap-2">
            <Avatar className="w-6 h-6">
              <AvatarImage
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${requestedBy}`}
              />
              <AvatarFallback>{requestedBy[0]}</AvatarFallback>
            </Avatar>
            <span>Requested by {requestedBy}</span>
          </div>
          <span>{requestedAt}</span>
        </div>

        {/* Approval Steps */}
        <div className="mb-6 bg-neutral-800/50 rounded-lg p-4">
          <p className="text-xs font-semibold text-neutral-400 uppercase mb-3">
            Approval Chain
          </p>
          <div className="space-y-2">
            {approvalSteps.map((step, idx) => {
              const Icon =
                step.status === 'approved'
                  ? CheckCircle2
                  : step.status === 'rejected'
                    ? XCircle
                    : Clock

              return (
                <div
                  key={idx}
                  className="flex items-center gap-3 text-sm"
                >
                  <Icon
                    className={`w-4 h-4 flex-shrink-0 ${
                      step.status === 'approved'
                        ? 'text-success-500'
                        : step.status === 'rejected'
                          ? 'text-danger-500'
                          : 'text-warning-500'
                    }`}
                  />
                  <div className="flex-1">
                    <p className="text-white">
                      {step.role}
                      {step.approvedBy && (
                        <span className="text-neutral-400">
                          {' '}
                          • Approved by {step.approvedBy}
                        </span>
                      )}
                    </p>
                    {step.comment && (
                      <p className="text-xs text-neutral-400 mt-1">
                        {step.comment}
                      </p>
                    )}
                    {step.approvedAt && (
                      <p className="text-xs text-neutral-500">{step.approvedAt}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Actions */}
        {status === 'pending' && (
          <div className="flex gap-3">
            <Button
              onClick={onReject}
              variant="outline"
              className="flex-1 border-danger-500/50 text-danger-500 hover:bg-danger-500/10"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject
            </Button>
            <Button
              onClick={onApprove}
              className="flex-1 bg-success-600 hover:bg-success-700 text-white"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Approve
            </Button>
          </div>
        )}
        {status !== 'pending' && (
          <div className="text-xs text-neutral-400 text-center p-2">
            {status === 'approved' && '✓ Approved'}
            {status === 'rejected' && '✕ Rejected'}
          </div>
        )}
      </div>
    </div>
  )
}
