import type { TicketPriority, TicketStatus } from './types'

export const priorityLabels: Record<TicketPriority, string> = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
  critical: 'Критический',
}

export const statusLabels: Record<TicketStatus, string> = {
  new: 'Новая',
  in_progress: 'В работе',
  waiting: 'Ожидает ответа',
  resolved: 'Решена',
}

export const agentStatusLabels = {
  online: 'На линии',
  busy: 'Занят',
  offline: 'Не в сети',
} as const

export function formatRelativeDate(value: string) {
  const minutes = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 60_000))

  if (minutes < 60) return `${minutes} мин. назад`

  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} ч. назад`

  const days = Math.round(hours / 24)
  return `${days} дн. назад`
}
