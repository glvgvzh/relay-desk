import { Link } from 'react-router-dom'
import { formatRelativeDate } from '../domain/labels'
import type { Agent, Queue, Ticket } from '../domain/types'
import { PriorityBadge, StatusBadge } from './StatusBadge'

type TicketTableProps = {
  tickets: Ticket[]
  queues: Queue[]
  agents?: Agent[]
}

export function TicketTable({ tickets, queues, agents = [] }: TicketTableProps) {
  const queueMap = new Map(queues.map((queue) => [queue.id, queue]))
  const agentMap = new Map(agents.map((agent) => [agent.id, agent]))

  return (
    <div className="table-wrap">
      <table className="ticket-table">
        <thead>
          <tr>
            <th scope="col">Заявка</th>
            <th scope="col">Очередь</th>
            <th scope="col">Приоритет</th>
            <th scope="col">Статус</th>
            <th scope="col">Исполнитель</th>
            <th scope="col">Обновлено</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((ticket) => {
            const queue = queueMap.get(ticket.queueId)
            const agent = ticket.assigneeId ? agentMap.get(ticket.assigneeId) : null

            return (
              <tr key={ticket.id}>
                <th scope="row">
                  <Link className="ticket-link" to={`/tickets/${ticket.id}`}>
                    {ticket.title}
                  </Link>
                  <small>
                    {ticket.id} · {ticket.requester.name}
                  </small>
                </th>
                <td>
                  <span className="queue-label">
                    <i style={{ background: queue?.color }} />
                    {queue?.name}
                  </span>
                </td>
                <td>
                  <PriorityBadge priority={ticket.priority} />
                </td>
                <td>
                  <StatusBadge status={ticket.status} />
                </td>
                <td>
                  {agent ? (
                    <span className="assignee">
                      <span className="avatar avatar-small">{agent.avatar}</span>
                      {agent.name}
                    </span>
                  ) : (
                    <span className="muted">Не назначен</span>
                  )}
                </td>
                <td>
                  <time dateTime={ticket.updatedAt}>{formatRelativeDate(ticket.updatedAt)}</time>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
