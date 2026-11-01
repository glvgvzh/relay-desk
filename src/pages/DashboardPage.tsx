import { Link } from 'react-router-dom'
import { relayDeskApi } from '../api/relayDeskApi'
import { ErrorState, LoadingState } from '../components/PageState'
import { PageHeader } from '../components/PageHeader'
import { TicketTable } from '../components/TicketTable'
import { agentStatusLabels } from '../domain/labels'
import { useAsyncData } from '../hooks/useAsyncData'

export function DashboardPage() {
  const dashboard = useAsyncData((signal) => relayDeskApi.getDashboard(signal), 'dashboard')

  if (dashboard.status === 'loading') return <LoadingState label="Собираем сводку" />
  if (dashboard.status === 'error') return <ErrorState />

  const { metrics, recentTickets, queues, agents } = dashboard.data
  const cards = [
    {
      label: 'Без исполнителя',
      value: metrics.unassigned,
      hint: 'требуют распределения',
      tone: 'neutral',
      to: '/tickets',
    },
    {
      label: 'Высокий приоритет',
      value: metrics.highPriority,
      hint: 'нужна реакция сегодня',
      tone: 'warning',
      to: '/tickets?priority=high',
    },
    {
      label: 'Просрочено',
      value: metrics.overdue,
      hint: 'за пределами SLA',
      tone: 'danger',
      to: '/tickets?sla=overdue',
    },
    {
      label: 'Решено всего',
      value: metrics.resolved,
      hint: `${metrics.slaPercent}% решённых в SLA`,
      tone: 'success',
      to: '/tickets?status=resolved',
    },
  ]

  return (
    <>
      <PageHeader
        eyebrow="Воскресенье, 1 ноября"
        title={`Доброе утро, ${dashboard.data.currentUser.name.split(' ')[0]}`}
        description="Сводка по очередям поддержки и работе команды на сегодня."
        actions={
          <Link className="primary-button" to="/tickets/new">
            Новая заявка
          </Link>
        }
      />

      <section aria-labelledby="summary-heading">
        <div className="section-heading">
          <div>
            <h2 id="summary-heading">Состояние поддержки</h2>
            <p>Активные показатели на 14:30</p>
          </div>
          <Link to="/reports">Открыть отчёты</Link>
        </div>
        <div className="metric-grid metric-grid-four">
          {cards.map((card) => (
            <Link className={`metric-card metric-${card.tone}`} key={card.label} to={card.to}>
              <div className="metric-card-header">
                <p>{card.label}</p>
                <span className="metric-indicator" />
              </div>
              <strong>{card.value}</strong>
              <small>{card.hint}</small>
            </Link>
          ))}
        </div>
      </section>

      <div className="dashboard-grid">
        <section className="panel dashboard-main" aria-labelledby="recent-heading">
          <div className="panel-header">
            <div>
              <h2 id="recent-heading">Последние заявки</h2>
              <p>Недавние изменения во всех очередях</p>
            </div>
            <Link to="/tickets">Смотреть все</Link>
          </div>
          <TicketTable tickets={recentTickets} queues={queues} agents={agents} />
        </section>

        <aside className="panel team-panel" aria-labelledby="team-heading">
          <div className="panel-header">
            <div>
              <h2 id="team-heading">Команда на линии</h2>
              <p>Текущая загрузка</p>
            </div>
            <Link to="/team">Команда</Link>
          </div>
          <ul className="agent-list">
            {agents.slice(0, 4).map((agent) => (
              <li key={agent.id}>
                <span className="avatar">{agent.avatar}</span>
                <span className="agent-summary">
                  <strong>{agent.name}</strong>
                  <small>{agentStatusLabels[agent.status]}</small>
                </span>
                <span className="capacity-value">
                  {agent.activeTickets}/{agent.capacity}
                </span>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      <section className="panel queue-panel" aria-labelledby="queues-heading">
        <div className="panel-header">
          <div>
            <h2 id="queues-heading">Очереди</h2>
            <p>Распределение открытых обращений</p>
          </div>
        </div>
        <div className="queue-grid">
          {dashboard.data.queueStats.map((queue) => {
            const maxQueue = Math.max(...dashboard.data.queueStats.map((item) => item.activeTickets), 1)
            return (
              <Link key={queue.id} to={`/tickets?queue=${queue.id}`}>
                <span className="queue-dot" style={{ background: queue.color }} />
                <div>
                  <strong>{queue.name}</strong>
                  <small>{queue.activeTickets} открытых</small>
                </div>
                <div className="progress">
                  <span style={{ width: `${(queue.activeTickets / maxQueue) * 100}%`, background: queue.color }} />
                </div>
              </Link>
            )
          })}
        </div>
      </section>
    </>
  )
}
