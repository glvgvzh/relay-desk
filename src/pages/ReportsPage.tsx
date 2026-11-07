import { Link } from 'react-router-dom'
import { relayDeskApi } from '../api/relayDeskApi'
import { ErrorState, LoadingState } from '../components/PageState'
import { PageHeader } from '../components/PageHeader'
import { useAsyncData } from '../hooks/useAsyncData'

export function ReportsPage() {
  const result = useAsyncData((signal) => relayDeskApi.getReports(signal), 'reports')
  if (result.status === 'loading') return <LoadingState label="Строим отчёты" />
  if (result.status === 'error') return <ErrorState onRetry={result.retry} />
  const max = Math.max(...result.data.weeklyVolume, 1)
  const weeklyTotal = result.data.weeklyVolume.reduce((sum, value) => sum + value, 0)
  return (
    <>
      <PageHeader
        eyebrow="Аналитика · данные baseline"
        title="Отчёты"
        description="Показатели вычисляются из того же набора заявок, что очередь и сводка."
      />
      <div className="metric-grid report-metrics">
        <article className="metric-card">
          <p>Первый ответ</p>
          <strong>
            {result.data.firstResponseMinutes === null ? 'Нет данных' : `${result.data.firstResponseMinutes} мин.`}
          </strong>
          <small>По первому публичному ответу</small>
        </article>
        <Link className="metric-card" to="/tickets?status=resolved">
          <p>Выполнение SLA</p>
          <strong>{result.data.slaPercent === null ? 'Нет данных' : `${result.data.slaPercent}%`}</strong>
          <small>{result.data.resolvedTickets} решённых заявок</small>
        </Link>
        <Link className="metric-card" to="/tickets">
          <p>Активные заявки</p>
          <strong>{result.data.activeTickets}</strong>
          <small>{result.data.unassignedTickets} без исполнителя</small>
        </Link>
        <Link className="metric-card" to="/tickets">
          <p>Всего заявок</p>
          <strong>{result.data.totalTickets}</strong>
          <small>Единый источник данных</small>
        </Link>
      </div>
      <div className="reports-grid">
        <section className="panel chart-panel" aria-labelledby="volume-heading">
          <div className="panel-header">
            <div>
              <h2 id="volume-heading">Поступившие заявки</h2>
              <p>По дням недели в текущих данных</p>
            </div>
            <strong>{weeklyTotal} всего</strong>
          </div>
          <div className="bar-chart" role="img" aria-label="Количество заявок по дням недели">
            {result.data.weeklyVolume.map((value, index) => (
              <div className="bar-column" key={result.data.labels[index]}>
                <span className="bar-value">{value}</span>
                <div className="bar-track">
                  <span style={{ height: `${(value / max) * 100}%` }} />
                </div>
                <small>{result.data.labels[index]}</small>
              </div>
            ))}
          </div>
        </section>
        <section className="panel queue-performance" aria-labelledby="performance-heading">
          <div className="panel-header">
            <div>
              <h2 id="performance-heading">SLA по очередям</h2>
              <p>Доля решённых в срок</p>
            </div>
          </div>
          <div className="performance-list">
            {result.data.resolutionByQueue.map(({ queue, value }) => (
              <article key={queue.id}>
                <header>
                  <span>
                    <i style={{ background: queue.color }} />
                    {queue.name}
                  </span>
                  <strong>{value === null ? 'Нет данных' : `${value}%`}</strong>
                </header>
                <div className="progress">
                  <span style={{ width: `${value ?? 0}%`, background: queue.color }} />
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </>
  )
}
