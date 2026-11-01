import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { relayDeskApi } from '../api/relayDeskApi'
import { EmptyState, ErrorState, LoadingState } from '../components/PageState'
import { PageHeader } from '../components/PageHeader'
import { TicketTable } from '../components/TicketTable'
import type { TicketPriority, TicketSort, TicketStatus } from '../domain/types'
import { useAsyncData } from '../hooks/useAsyncData'

export function TicketsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''
  const [queryDraft, setQueryDraft] = useState(query)
  const status = (searchParams.get('status') ?? 'all') as TicketStatus | 'all'
  const queueId = searchParams.get('queue') ?? 'all'
  const priority = (searchParams.get('priority') ?? 'all') as TicketPriority | 'all'
  const sort = (searchParams.get('sort') ?? 'updated_desc') as TicketSort
  const sla = (searchParams.get('sla') ?? 'all') as 'all' | 'overdue'

  const result = useAsyncData(
    (signal) => relayDeskApi.getTickets({ query, status, queueId, priority, sort, sla }, signal),
    `tickets:${query}:${status}:${queueId}:${priority}:${sort}:${sla}`,
  )

  function updateFilter(name: string, value: string) {
    const next = new URLSearchParams(searchParams)
    if (!value || value === 'all') next.delete(name)
    else next.set(name, value)
    setSearchParams(next, { replace: true })
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    updateFilter('q', queryDraft)
  }

  return (
    <>
      <PageHeader
        eyebrow="Рабочее пространство"
        title="Заявки"
        description="Обрабатывайте обращения сотрудников и следите за сроками обслуживания."
        actions={
          <Link className="primary-button" to="/tickets/new">
            Создать заявку
          </Link>
        }
      />

      <section className="panel ticket-workspace" aria-label="Очередь заявок">
        <div className="ticket-tabs">
          <h2 className="ticket-view-title">Все заявки</h2>
        </div>

        <form className="filters" onSubmit={submitSearch}>
          <label className="filter-search">
            <span className="sr-only">Поиск заявок</span>
            <span aria-hidden="true">⌕</span>
            <input
              value={queryDraft}
              onChange={(event) => setQueryDraft(event.target.value)}
              type="search"
              placeholder="Номер, тема или автор"
            />
          </label>
          <label>
            <span className="sr-only">Статус</span>
            <select value={status} onChange={(event) => updateFilter('status', event.target.value)}>
              <option value="all">Все статусы</option>
              <option value="new">Новые</option>
              <option value="in_progress">В работе</option>
              <option value="waiting">Ожидают ответа</option>
              <option value="resolved">Решённые</option>
            </select>
          </label>
          <label>
            <span className="sr-only">Очередь</span>
            <select value={queueId} onChange={(event) => updateFilter('queue', event.target.value)}>
              <option value="all">Все очереди</option>
              <option value="access">Доступы</option>
              <option value="workplace">Рабочее место</option>
              <option value="finance">Финансы</option>
              <option value="people">Сотрудники</option>
            </select>
          </label>
          <label>
            <span className="sr-only">Приоритет</span>
            <select value={priority} onChange={(event) => updateFilter('priority', event.target.value)}>
              <option value="all">Любой приоритет</option>
              <option value="critical">Критический</option>
              <option value="high">Высокий</option>
              <option value="medium">Средний</option>
              <option value="low">Низкий</option>
            </select>
          </label>
          <label>
            <span className="sr-only">Сортировка</span>
            <select value={sort} onChange={(event) => updateFilter('sort', event.target.value)}>
              <option value="updated_desc">Недавно обновлённые</option>
              <option value="created_desc">Сначала новые</option>
              <option value="priority_desc">Сначала важные</option>
            </select>
          </label>
          <label>
            <span className="sr-only">SLA</span>
            <select value={sla} onChange={(event) => updateFilter('sla', event.target.value)}>
              <option value="all">Любой SLA</option>
              <option value="overdue">Только просроченные</option>
            </select>
          </label>
          <button className="filter-submit" type="submit">
            Найти
          </button>
        </form>

        {result.status === 'loading' && <LoadingState label="Загружаем заявки" />}
        {result.status === 'error' && <ErrorState />}
        {result.status === 'success' && result.data.tickets.length === 0 && (
          <EmptyState title="Заявки не найдены" description="Измените условия поиска или сбросьте фильтры." />
        )}
        {result.status === 'success' && result.data.tickets.length > 0 && (
          <>
            <TicketTable tickets={result.data.tickets} queues={result.data.queues} agents={result.data.agents} />
            <footer className="table-footer">
              <span>
                Показано {result.data.total} из {result.data.total}
              </span>
              <div>
                <button type="button" disabled>
                  Назад
                </button>
                <button type="button" disabled>
                  Вперёд
                </button>
              </div>
            </footer>
          </>
        )}
      </section>
    </>
  )
}
