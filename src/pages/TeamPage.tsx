import { relayDeskApi } from '../api/relayDeskApi'
import { ErrorState, LoadingState } from '../components/PageState'
import { PageHeader } from '../components/PageHeader'
import { agentStatusLabels } from '../domain/labels'
import { useAsyncData } from '../hooks/useAsyncData'

export function TeamPage() {
  const [query, setQuery] = useState('')
  const result = useAsyncData((signal) => relayDeskApi.getTeam(signal), 'team')
  if (result.status === 'loading') return <LoadingState label="Загружаем команду" />
  if (result.status === 'error') return <ErrorState onRetry={result.retry} />

  const normalizedQuery = query.trim().toLocaleLowerCase('ru')
  const visibleAgents = result.data.agents.filter(
    (agent) =>
      !normalizedQuery ||
      `${agent.name} ${agent.email} ${agent.role}`.toLocaleLowerCase('ru').includes(normalizedQuery),
  )
  const onlineCount = result.data.agents.filter((agent) => agent.status === 'online').length
  const busyCount = result.data.agents.filter((agent) => agent.status === 'busy').length
  const offlineCount = result.data.agents.filter((agent) => agent.status === 'offline').length
  const activeTickets = result.data.agents.reduce((sum, agent) => sum + agent.activeTickets, 0)

  return (
    <>
      <PageHeader
        eyebrow="Управление"
        title="Команда поддержки"
        description="Доступность специалистов, текущая нагрузка и распределение ответственности."
      />
      <div className="team-summary">
        <article>
          <span className="summary-icon summary-green">●</span>
          <div>
            <strong>{onlineCount}</strong>
            <span>на линии</span>
          </div>
        </article>
        <article>
          <span className="summary-icon summary-yellow">●</span>
          <div>
            <strong>{busyCount}</strong>
            <span>занят</span>
          </div>
        </article>
        <article>
          <span className="summary-icon summary-gray">●</span>
          <div>
            <strong>{offlineCount}</strong>
            <span>не в сети</span>
          </div>
        </article>
        <article>
          <span className="summary-icon">◷</span>
          <div>
            <strong>{activeTickets}</strong>
            <span>активных заявок</span>
          </div>
        </article>
      </div>
      <section className="panel team-table-panel" aria-labelledby="specialists-heading">
        <div className="panel-header">
          <div>
            <h2 id="specialists-heading">Специалисты</h2>
            <p>Данные обновлены несколько секунд назад</p>
          </div>
          <label className="compact-search">
            <span aria-hidden="true">⌕</span>
            <span className="sr-only">Поиск специалиста</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              type="search"
              placeholder="Найти специалиста"
            />
          </label>
        </div>
        <div className="table-wrap">
          <table className="team-table">
            <thead>
              <tr>
                <th scope="col">Сотрудник</th>
                <th scope="col">Статус</th>
                <th scope="col">Роль</th>
                <th scope="col">Нагрузка</th>
                <th scope="col">Активные заявки</th>
              </tr>
            </thead>
            <tbody>
              {visibleAgents.map((agent) => {
                const percent = Math.round((agent.activeTickets / agent.capacity) * 100)
                return (
                  <tr key={agent.id}>
                    <th scope="row">
                      <span className="assignee">
                        <span className="avatar">{agent.avatar}</span>
                        <span>
                          <strong>{agent.name}</strong>
                          <small>{agent.email}</small>
                        </span>
                      </span>
                    </th>
                    <td>
                      <span className={`agent-status agent-status-${agent.status}`}>
                        <i />
                        {agentStatusLabels[agent.status]}
                      </span>
                    </td>
                    <td>{agent.role}</td>
                    <td>
                      <div className="workload">
                        <div>
                          <span style={{ width: `${percent}%` }} />
                        </div>
                        <small>{percent}%</small>
                      </div>
                    </td>
                    <td>
                      <strong>{agent.activeTickets}</strong> из {agent.capacity}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
      <section className="panel responsibility-panel" aria-labelledby="responsibility-heading">
        <div className="panel-header">
          <div>
            <h2 id="responsibility-heading">Зоны ответственности</h2>
            <p>Основные очереди и ответственные команды</p>
          </div>
        </div>
        <div className="responsibility-grid">
          {result.data.queues.map((queue) => {
            const teams = result.data.supportTeams.filter((team) => team.queueIds.includes(queue.id))
            const agentCount = result.data.agents.filter((agent) =>
              teams.some((team) => team.id === agent.teamId),
            ).length
            return (
              <article key={queue.id}>
                <span className="queue-dot" style={{ background: queue.color }} />
                <div>
                  <strong>{queue.name}</strong>
                  <small>
                    {teams.map((team) => team.name).join(', ')} · {agentCount} специалистов
                  </small>
                </div>
              </article>
            )
          })}
        </div>
      </section>
    </>
  )
}

import { useState } from 'react'
