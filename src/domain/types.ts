export type TicketPriority = 'low' | 'medium' | 'high' | 'critical'
export type TicketStatus = 'new' | 'in_progress' | 'waiting' | 'resolved'

export type Queue = {
  id: string
  name: string
  color: string
}

export type Person = {
  id: string
  name: string
  email: string
  department: string
  avatar: string
}

export type Agent = Person & {
  role: string
  status: 'online' | 'busy' | 'offline'
  activeTickets: number
  capacity: number
}

export type TicketMessage = {
  id: string
  author: string
  authorRole: 'requester' | 'agent' | 'system'
  createdAt: string
  body: string
}

export type TicketActivity = {
  id: string
  createdAt: string
  label: string
}

export type Ticket = {
  id: string
  title: string
  description: string
  requester: Person
  assigneeId: string | null
  queueId: string
  priority: TicketPriority
  status: TicketStatus
  createdAt: string
  updatedAt: string
  slaDueAt: string
  tags: string[]
  messages: TicketMessage[]
  activity: TicketActivity[]
}

export type CatalogService = {
  id: string
  category: string
  title: string
  description: string
  deliveryTime: string
  icon: string
  popular: boolean
}

export type KnowledgeArticle = {
  id: string
  category: string
  title: string
  summary: string
  updatedAt: string
  views: number
  helpfulPercent: number
}

export type TicketFilters = {
  query?: string
  status?: TicketStatus | 'all'
  queueId?: string | 'all'
  priority?: TicketPriority | 'all'
}

export type CreateTicketInput = {
  title: string
  description: string
  requesterName: string
  requesterEmail: string
  requesterDepartment: string
  queueId: string
  priority: TicketPriority
  serviceId?: string
}

export type UpdateTicketInput = {
  status: TicketStatus
  queueId: string
  assigneeId: string | null
  priority: TicketPriority
}

