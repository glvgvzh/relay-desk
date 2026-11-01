import {
  agents,
  catalogServices,
  categories,
  knowledgeArticles,
  organizations,
  queues,
  supportTeams,
  tickets as initialTickets,
} from '../data/fixtures'
import { priorityLabels, statusLabels } from '../domain/labels'
import type {
  CreateTicketInput,
  CurrentUser,
  Permission,
  Ticket,
  TicketFilters,
  TicketPriority,
  UpdateTicketInput,
  UserRole,
} from '../domain/types'

const STORAGE_KEY = 'relay-desk:tickets:v1'
const REFERENCE_TIME = new Date('2026-11-01T14:30:00+03:00')
const priorityWeight: Record<TicketPriority, number> = { low: 1, medium: 2, high: 3, critical: 4 }
type Operation =
  | 'shell'
  | 'dashboard'
  | 'tickets'
  | 'ticket'
  | 'catalog'
  | 'knowledge'
  | 'team'
  | 'reports'
  | 'create'
  | 'update'
  | 'reply'
const rolePermissions: Record<UserRole, Permission[]> = {
  l1: ['manage_ticket'],
  l2: ['manage_ticket', 'assign_any_agent'],
  lead: ['manage_ticket', 'assign_any_agent', 'view_management'],
  admin: ['manage_ticket', 'assign_any_agent', 'view_management'],
}
let currentUserId = 'agent-5'
let pendingFailure: { operation: Operation; message: string } | null = null

function readStoredTickets(): Ticket[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return structuredClone(initialTickets)
    const parsed: unknown = JSON.parse(raw)
    if (
      !Array.isArray(parsed) ||
      !parsed.every((ticket) => typeof ticket === 'object' && ticket !== null && 'id' in ticket)
    )
      throw new Error('Некорректные данные')
    return parsed as Ticket[]
  } catch {
    return structuredClone(initialTickets)
  }
}
let ticketStore: Ticket[] = readStoredTickets()
function persistTickets() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ticketStore))
  window.dispatchEvent(new CustomEvent('relaydesk:datachange'))
}
function now() {
  return new Date().toISOString()
}
function getCurrentUser(): CurrentUser {
  const agent = agents.find((item) => item.id === currentUserId) ?? agents[0]
  return { id: agent.id, name: agent.name, avatar: agent.avatar, role: agent.role, userRole: agent.userRole }
}
export function can(role: UserRole, permission: Permission) {
  return rolePermissions[role].includes(permission)
}
function requirePermission(permission: Permission) {
  if (!can(getCurrentUser().userRole, permission)) throw new Error('Недостаточно прав для выполнения действия')
}
function requireTicket(ticketId: string) {
  const ticket = ticketStore.find((item) => item.id === ticketId)
  if (!ticket) throw new Error(`Заявка ${ticketId} не найдена`)
  return ticket
}
function request<T>(operation: Operation, producer: () => T, signal?: AbortSignal, delay = 90): Promise<T> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Request aborted', 'AbortError'))
      return
    }
    const timeout = window.setTimeout(() => {
      if (pendingFailure?.operation === operation) {
        const failure = pendingFailure
        pendingFailure = null
        reject(new Error(failure.message))
        return
      }
      try {
        resolve(structuredClone(producer()))
      } catch (error) {
        reject(error)
      }
    }, delay)
    signal?.addEventListener(
      'abort',
      () => {
        window.clearTimeout(timeout)
        reject(new DOMException('Request aborted', 'AbortError'))
      },
      { once: true },
    )
  })
}
function activeCountForAgent(agentId: string) {
  return ticketStore.filter((ticket) => ticket.assigneeId === agentId && ticket.status !== 'resolved').length
}
function agentsWithLoad() {
  return agents.map((agent) => ({ ...agent, activeTickets: activeCountForAgent(agent.id) }))
}
function queueStats() {
  return queues.map((queue) => ({
    ...queue,
    activeTickets: ticketStore.filter((ticket) => ticket.queueId === queue.id && ticket.status !== 'resolved').length,
  }))
}
function isWithinSla(ticket: Ticket) {
  return ticket.status === 'resolved' && new Date(ticket.updatedAt) <= new Date(ticket.slaDueAt)
}

export const relayDeskApi = {
  async getShell(signal?: AbortSignal) {
    return request(
      'shell',
      () => ({
        currentUser: getCurrentUser(),
        activeTickets: ticketStore.filter((ticket) => ticket.status !== 'resolved').length,
        canViewManagement: can(getCurrentUser().userRole, 'view_management'),
      }),
      signal,
    )
  },
  async getDashboard(signal?: AbortSignal) {
    return request(
      'dashboard',
      () => {
        const activeTickets = ticketStore.filter((ticket) => ticket.status !== 'resolved')
        const resolved = ticketStore.filter((ticket) => ticket.status === 'resolved')
        return {
          metrics: {
            unassigned: activeTickets.filter((ticket) => !ticket.assigneeId).length,
            highPriority: activeTickets.filter((ticket) => ticket.priority === 'high').length,
            resolved: resolved.length,
            overdue: activeTickets.filter((ticket) => new Date(ticket.slaDueAt) < REFERENCE_TIME).length,
            slaPercent: resolved.length
              ? Math.round((resolved.filter(isWithinSla).length / resolved.length) * 100)
              : 100,
          },
          recentTickets: [...ticketStore].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5),
          queues,
          queueStats: queueStats(),
          agents: agentsWithLoad(),
          currentUser: getCurrentUser(),
        }
      },
      signal,
    )
  },
  async getTickets(filters: TicketFilters = {}, signal?: AbortSignal) {
    return request(
      'tickets',
      () => {
        const query = filters.query?.trim().toLocaleLowerCase('ru') ?? ''
        const result = ticketStore.filter((ticket) => {
          const organization = organizations.find((item) => item.id === ticket.requester.organizationId)
          const matchesQuery =
            !query ||
            `${ticket.id} ${ticket.title} ${ticket.requester.name} ${organization?.name ?? ''}`
              .toLocaleLowerCase('ru')
              .includes(query)
          return (
            matchesQuery &&
            (!filters.status || filters.status === 'all' || ticket.status === filters.status) &&
            (!filters.queueId || filters.queueId === 'all' || ticket.queueId === filters.queueId) &&
            (!filters.priority || filters.priority === 'all' || ticket.priority === filters.priority) &&
            (!filters.sla || filters.sla === 'all' || new Date(ticket.slaDueAt) < REFERENCE_TIME)
          )
        })
        const sort = filters.sort ?? 'updated_desc'
        result.sort((a, b) =>
          sort === 'created_desc'
            ? b.createdAt.localeCompare(a.createdAt)
            : sort === 'priority_desc'
              ? priorityWeight[b.priority] - priorityWeight[a.priority] || b.updatedAt.localeCompare(a.updatedAt)
              : b.updatedAt.localeCompare(a.updatedAt),
        )
        return { tickets: result, queues, agents: agentsWithLoad(), total: result.length }
      },
      signal,
    )
  },
  async getTicket(ticketId: string, signal?: AbortSignal) {
    return request(
      'ticket',
      () => {
        const ticket = ticketStore.find((item) => item.id === ticketId)
        return ticket
          ? {
              ticket,
              queues,
              categories,
              organizations,
              agents: agentsWithLoad(),
              currentUser: getCurrentUser(),
              canAssignAny: can(getCurrentUser().userRole, 'assign_any_agent'),
            }
          : null
      },
      signal,
    )
  },
  async getCatalog(signal?: AbortSignal) {
    return request('catalog', () => catalogServices, signal)
  },
  async getCatalogService(serviceId: string, signal?: AbortSignal) {
    return request('catalog', () => catalogServices.find((service) => service.id === serviceId) ?? null, signal)
  },
  async getCreateTicketForm(serviceId?: string, signal?: AbortSignal) {
    return request(
      'catalog',
      () => ({
        queues,
        categories,
        organizations,
        service: serviceId ? (catalogServices.find((item) => item.id === serviceId) ?? null) : null,
      }),
      signal,
    )
  },
  async getKnowledgeBase(signal?: AbortSignal) {
    return request('knowledge', () => knowledgeArticles, signal)
  },
  async getKnowledgeArticle(articleId: string, signal?: AbortSignal) {
    return request('knowledge', () => knowledgeArticles.find((article) => article.id === articleId) ?? null, signal)
  },
  async getTeam(signal?: AbortSignal) {
    return request('team', () => ({ agents: agentsWithLoad(), queues, supportTeams }), signal)
  },
  async getReports(signal?: AbortSignal) {
    return request(
      'reports',
      () => {
        const labels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
        const weeklyVolume = labels.map(
          (_, day) =>
            ticketStore.filter((ticket) => {
              const date = new Date(ticket.createdAt)
              return (date.getDay() === 0 ? 6 : date.getDay() - 1) === day
            }).length,
        )
        const resolved = ticketStore.filter((ticket) => ticket.status === 'resolved')
        const responseTimes = ticketStore.flatMap((ticket) => {
          const first = ticket.messages.find(
            (message) => message.authorRole === 'agent' && message.visibility === 'public',
          )
          return first ? [(new Date(first.createdAt).getTime() - new Date(ticket.createdAt).getTime()) / 60_000] : []
        })
        return {
          weeklyVolume,
          labels,
          totalTickets: ticketStore.length,
          activeTickets: ticketStore.filter((ticket) => ticket.status !== 'resolved').length,
          resolvedTickets: resolved.length,
          unassignedTickets: ticketStore.filter((ticket) => ticket.status !== 'resolved' && !ticket.assigneeId).length,
          resolutionByQueue: queues.map((queue) => {
            const items = resolved.filter((ticket) => ticket.queueId === queue.id)
            return {
              queue,
              value: items.length ? Math.round((items.filter(isWithinSla).length / items.length) * 100) : null,
            }
          }),
          firstResponseMinutes: responseTimes.length
            ? Math.round(responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length)
            : null,
          slaPercent: resolved.length
            ? Math.round((resolved.filter(isWithinSla).length / resolved.length) * 100)
            : null,
        }
      },
      signal,
    )
  },
  async createTicket(input: CreateTicketInput, signal?: AbortSignal) {
    return request(
      'create',
      () => {
        if (input.title.trim().length < 5 || input.description.trim().length < 10)
          throw new Error('Проверьте тему и описание заявки')
        if (!organizations.some((item) => item.id === input.organizationId)) throw new Error('Организация не найдена')
        if (!categories.some((item) => item.id === input.categoryId && item.queueId === input.queueId))
          throw new Error('Категория не относится к выбранной очереди')
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
            organizationId: input.organizationId,
            avatar: input.requesterName
              .trim()
              .split(/\s+/)
              .map((part) => part[0])
              .join('')
              .slice(0, 2)
              .toLocaleUpperCase('ru'),
          },
          assigneeId: null,
          queueId: input.queueId,
          categoryId: input.categoryId,
          priority: input.priority,
          status: 'new',
          createdAt,
          updatedAt: createdAt,
          slaDueAt: new Date(Date.now() + 86_400_000).toISOString(),
          tags: input.serviceId ? [input.serviceId] : [],
          messages: [],
          activity: [
            {
              id: `activity-${idNumber}-1`,
              createdAt,
              label: input.serviceId ? 'Заявка создана из каталога услуг' : 'Заявка создана через Relay Desk',
            },
          ],
        }
        ticketStore = [ticket, ...ticketStore]
        persistTickets()
        return ticket
      },
      signal,
      140,
    )
  },
  async updateTicket(ticketId: string, input: UpdateTicketInput, signal?: AbortSignal) {
    return request(
      'update',
      () => {
        requirePermission('manage_ticket')
        const ticket = requireTicket(ticketId)
        const user = getCurrentUser()
        if (!categories.some((item) => item.id === input.categoryId && item.queueId === input.queueId)) {
          throw new Error('Категория не относится к выбранной очереди')
        }
        if (
          input.assigneeId !== ticket.assigneeId &&
          input.assigneeId !== user.id &&
          !can(user.userRole, 'assign_any_agent')
        )
          throw new Error('Первая линия может назначить заявку только на себя')
        const changes: string[] = []
        if (ticket.status !== input.status) changes.push(`Статус изменён на «${statusLabels[input.status]}»`)
        if (ticket.priority !== input.priority) changes.push(`Приоритет изменён на «${priorityLabels[input.priority]}»`)
        if (ticket.queueId !== input.queueId) changes.push('Заявка перенесена в другую очередь')
        if (ticket.categoryId !== input.categoryId) changes.push('Категория заявки изменена')
        if (ticket.assigneeId !== input.assigneeId) {
          const agent = agents.find((item) => item.id === input.assigneeId)
          changes.push(agent ? `Назначен исполнитель: ${agent.name}` : 'Исполнитель снят')
        }
        const updatedAt = now()
        Object.assign(ticket, input, { updatedAt })
        ticket.activity.push(
          ...changes.map((label, index) => ({
            id: `activity-${ticket.id}-${ticket.activity.length + index + 1}`,
            createdAt: updatedAt,
            label,
          })),
        )
        persistTickets()
        return { ticket, queues, agents: agentsWithLoad() }
      },
      signal,
      120,
    )
  },
  async addReply(ticketId: string, body: string, internal = false, signal?: AbortSignal) {
    return request(
      'reply',
      () => {
        requirePermission('manage_ticket')
        const ticket = requireTicket(ticketId)
        const trimmedBody = body.trim()
        if (!trimmedBody) throw new Error('Введите текст сообщения')
        const createdAt = now()
        const user = getCurrentUser()
        ticket.messages.push({
          id: `message-${ticket.id}-${ticket.messages.length + 1}`,
          author: user.name,
          authorRole: 'agent',
          createdAt,
          body: trimmedBody,
          visibility: internal ? 'internal' : 'public',
        })
        ticket.activity.push({
          id: `activity-${ticket.id}-${ticket.activity.length + 1}`,
          createdAt,
          label: internal ? 'Добавлена внутренняя заметка' : 'Отправлен ответ сотруднику',
        })
        ticket.updatedAt = createdAt
        if (!internal && ticket.status === 'new') ticket.status = 'in_progress'
        persistTickets()
        return { ticket, queues, agents: agentsWithLoad() }
      },
      signal,
      120,
    )
  },
  failNextForTests(operation: Operation, message = 'Тестовый отказ локального API') {
    pendingFailure = { operation, message }
  },
  setCurrentUserForTests(agentId: string) {
    currentUserId = agentId
  },
  reloadFromStorageForTests() {
    ticketStore = readStoredTickets()
  },
  resetForTests() {
    window.localStorage.removeItem(STORAGE_KEY)
    ticketStore = structuredClone(initialTickets)
    currentUserId = 'agent-5'
    pendingFailure = null
  },
}
