import { agents, catalogServices, knowledgeArticles, queues, tickets as initialTickets } from '../data/fixtures'
import { priorityLabels, statusLabels } from '../domain/labels'
import type { CreateTicketInput, Ticket, TicketFilters, UpdateTicketInput } from '../domain/types'

let ticketStore: Ticket[] = structuredClone(initialTickets)

function now() {
  return new Date().toISOString()
}

function requireTicket(ticketId: string) {
  const ticket = ticketStore.find((item) => item.id === ticketId)
  if (!ticket) throw new Error(`Заявка ${ticketId} не найдена`)
  return ticket
}

function respond<T>(value: T, signal?: AbortSignal, delay = 180): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => resolve(structuredClone(value)), delay)

    signal?.addEventListener('abort', () => {
      window.clearTimeout(timeout)
      reject(new DOMException('Request aborted', 'AbortError'))
    }, { once: true })
  })
}

export const relayDeskApi = {
  async getDashboard(signal?: AbortSignal) {
    const activeTickets = ticketStore.filter((ticket) => ticket.status !== 'resolved')
    const overdue = activeTickets.filter((ticket) => new Date(ticket.slaDueAt) < new Date('2026-11-01T14:30:00+03:00'))

    return respond({
      metrics: {
        unassigned: activeTickets.filter((ticket) => !ticket.assigneeId).length,
        dueSoon: activeTickets.filter((ticket) => ticket.priority === 'high' || ticket.priority === 'critical').length,
        resolvedToday: ticketStore.filter((ticket) => ticket.status === 'resolved').length,
        overdue: overdue.length,
      },
      recentTickets: ticketStore.slice(0, 5),
      queues,
      agents,
    }, signal)
  },

  async getTickets(filters: TicketFilters = {}, signal?: AbortSignal) {
    const query = filters.query?.trim().toLocaleLowerCase('ru') ?? ''
    const result = ticketStore.filter((ticket) => {
      const matchesQuery = !query || `${ticket.id} ${ticket.title} ${ticket.requester.name}`.toLocaleLowerCase('ru').includes(query)
      const matchesStatus = !filters.status || filters.status === 'all' || ticket.status === filters.status
      const matchesQueue = !filters.queueId || filters.queueId === 'all' || ticket.queueId === filters.queueId
      const matchesPriority = !filters.priority || filters.priority === 'all' || ticket.priority === filters.priority
      return matchesQuery && matchesStatus && matchesQueue && matchesPriority
    })

    return respond({ tickets: result, queues, agents, total: result.length }, signal)
  },

  async getTicket(ticketId: string, signal?: AbortSignal) {
    const ticket = ticketStore.find((item) => item.id === ticketId)
    return respond(ticket ? { ticket, queues, agents } : null, signal)
  },

  async getCatalog(signal?: AbortSignal) {
    return respond(catalogServices, signal)
  },

  async getKnowledgeBase(signal?: AbortSignal) {
    return respond(knowledgeArticles, signal)
  },

  async getTeam(signal?: AbortSignal) {
    return respond({ agents, queues }, signal)
  },

  async getReports(signal?: AbortSignal) {
    return respond({
      weeklyVolume: [42, 58, 51, 67, 73, 64, 49],
      labels: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
      resolutionByQueue: queues.map((queue, index) => ({ queue, value: [82, 74, 91, 87][index] })),
      firstResponseMinutes: 18,
      satisfaction: 4.7,
      slaPercent: 86,
    }, signal)
  },

  async createTicket(input: CreateTicketInput, signal?: AbortSignal) {
    const idNumber = Math.max(...ticketStore.map((ticket) => Number(ticket.id.replace('RD-', '')))) + 1
    const createdAt = now()
    const ticket: Ticket = {
      id: `RD-${idNumber}`,
      title: input.title.trim(),
      description: input.description.trim(),
      requester: {
        id: `person-created-${idNumber}`,
        name: input.requesterName.trim(),
        email: input.requesterEmail.trim(),
        department: input.requesterDepartment.trim(),
        avatar: input.requesterName.trim().split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toLocaleUpperCase('ru'),
      },
      assigneeId: null,
      queueId: input.queueId,
      priority: input.priority,
      status: 'new',
      createdAt,
      updatedAt: createdAt,
      slaDueAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      tags: input.serviceId ? [input.serviceId] : [],
      messages: [],
      activity: [{ id: `activity-${idNumber}-1`, createdAt, label: 'Заявка создана через Relay Desk' }],
    }
    ticketStore = [ticket, ...ticketStore]
    return respond(structuredClone(ticket), signal, 260)
  },

  async updateTicket(ticketId: string, input: UpdateTicketInput, signal?: AbortSignal) {
    const ticket = requireTicket(ticketId)
    const changes: string[] = []
    if (ticket.status !== input.status) changes.push(`Статус изменён на «${statusLabels[input.status]}»`)
    if (ticket.priority !== input.priority) changes.push(`Приоритет изменён на «${priorityLabels[input.priority]}»`)
    if (ticket.queueId !== input.queueId) changes.push('Заявка перенесена в другую очередь')
    if (ticket.assigneeId !== input.assigneeId) {
      const agent = agents.find((item) => item.id === input.assigneeId)
      changes.push(agent ? `Назначен исполнитель: ${agent.name}` : 'Исполнитель снят')
    }
    const updatedAt = now()
    Object.assign(ticket, input, { updatedAt })
    ticket.activity.push(...changes.map((label, index) => ({ id: `activity-${ticket.id}-${ticket.activity.length + index + 1}`, createdAt: updatedAt, label })))
    return respond({ ticket, queues, agents }, signal, 220)
  },

  async addReply(ticketId: string, body: string, internal = false, signal?: AbortSignal) {
    const ticket = requireTicket(ticketId)
    const trimmedBody = body.trim()
    if (!trimmedBody) throw new Error('Введите текст сообщения')
    const createdAt = now()
    ticket.messages.push({
      id: `message-${ticket.id}-${ticket.messages.length + 1}`,
      author: 'Анна Ким',
      authorRole: 'agent',
      createdAt,
      body: internal ? `[Внутренняя заметка] ${trimmedBody}` : trimmedBody,
    })
    ticket.activity.push({
      id: `activity-${ticket.id}-${ticket.activity.length + 1}`,
      createdAt,
      label: internal ? 'Добавлена внутренняя заметка' : 'Отправлен ответ сотруднику',
    })
    ticket.updatedAt = createdAt
    if (!internal && ticket.status === 'new') ticket.status = 'in_progress'
    return respond({ ticket, queues, agents }, signal, 220)
  },

  resetForTests() {
    ticketStore = structuredClone(initialTickets)
  },
}

