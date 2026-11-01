import { priorityLabels, statusLabels } from '../domain/labels'
import type { TicketPriority, TicketStatus } from '../domain/types'

export function StatusBadge({ status }: { status: TicketStatus }) {
  return <span className={`badge badge-status badge-${status}`}>{statusLabels[status]}</span>
}

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  return <span className={`badge badge-priority badge-${priority}`}>{priorityLabels[priority]}</span>
}
