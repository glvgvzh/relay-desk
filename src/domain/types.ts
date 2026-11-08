export type TicketPriority = 'low' | 'medium' | 'high' | 'critical'
export type TicketStatus = 'new' | 'in_progress' | 'waiting' | 'resolved'
export type TicketSort = 'updated_desc' | 'created_desc' | 'priority_desc'
export type UserRole = 'l1' | 'l2' | 'lead' | 'admin'

export type Organization = {
  id: string
  name: string
  domain: string
}

export type SupportTeam = {
  id: string
  name: string
  queueIds: string[]
}

export type TicketCategory = {
  id: string
  name: string
  queueId: string
}

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
  organizationId: string
}

export type Agent = Person & {
  role: string
  userRole: UserRole
  teamId: string
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
  visibility: 'public' | 'internal'
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
  categoryId: string
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
  queueId: string
  categoryId: string
  defaultPriority: TicketPriority
  requestTitle: string
  requestDescription: string
}

export type KnowledgeArticle = {
  id: string
  category: string
  title: string
  summary: string
  updatedAt: string
  views: number
  helpfulPercent: number
  lead: string
  sections: Array<{ heading: string; body: string }>
}

export type TicketFilters = {
  query?: string
  status?: TicketStatus | 'all'
  queueId?: string | 'all'
  priority?: TicketPriority | 'all'
  sort?: TicketSort
  sla?: 'all' | 'overdue'
  assignee?: 'all' | 'unassigned' | Ticket['assigneeId']
}

export type CreateTicketInput = {
  title: string
  description: string
  requesterName: string
  requesterEmail: string
  requesterDepartment: string
  organizationId: string
  queueId: string
  categoryId: string
  priority: TicketPriority
  serviceId?: string
}

export type CurrentUser = Pick<Agent, 'id' | 'name' | 'avatar' | 'role' | 'userRole'>

export type Permission = 'manage_ticket' | 'assign_any_agent' | 'view_management'

export type UpdateTicketInput = {
  status: TicketStatus
  queueId: string
  categoryId: string
  assigneeId: string | null
  priority: TicketPriority
}
