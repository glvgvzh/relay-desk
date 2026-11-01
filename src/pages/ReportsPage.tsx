import { relayDeskApi } from '../api/relayDeskApi'
import { ErrorState, LoadingState } from '../components/PageState'
import { PageHeader } from '../components/PageHeader'
import { useAsyncData } from '../hooks/useAsyncData'

export function ReportsPage() {
  const result = useAsyncData((signal) => relayDeskApi.getReports(signal), 'reports')
  if (result.status === 'loading') return <LoadingState label="Строим отчёты" />
  if (result.status === 'error') return <ErrorState />

  const max = Math.max(...result.data.weeklyVolume)

  return (
    <>
      <PageHeader eyebrow="Аналитика · 1–7 ноября" title="Отчёты" description="Ключевые показатели работы поддержки и соблюдения уровня сервиса." />
      <div className="metric-grid report-metrics">
        <article className="metric-card"><p>Первый ответ</p><strong>{result.data.firstResponseMinutes} мин.</strong><small className="trend-positive">↓ 12% к прошлой неделе</small></article>
        <article className="metric-card"><p>Выполнение SLA</p><strong>{result.data.slaPercent}%</strong><small className="trend-negative">↓ 3 п. п.</small></article>
        <article className="metric-card"><p>Оценка сотрудников</p><strong>{result.data.satisfaction}</strong><small className="trend-positive">↑ 0,2 за неделю</small></article>
        <article className="metric-card"><p>Решено заявок</p><strong>146</strong><small className="trend-positive">↑ 8% к прошлой неделе</small></article>
      </div>
      <div className="reports-grid">
        <section className="panel chart-panel" aria-labelledby="volume-heading"><div className="panel-header"><div><h2 id="volume-heading">Поступившие заявки</h2><p>По дням недели</p></div><strong>404 всего</strong></div><div className="bar-chart" role="img" aria-label="Количество заявок по дням недели">{result.data.weeklyVolume.map((value, index) => <div className="bar-column" key={result.data.labels[index]}><span className="bar-value">{value}</span><div className="bar-track"><span style={{ height: `${value / max * 100}%` }} /></div><small>{result.data.labels[index]}</small></div>)}</div></section>
        <section className="panel queue-performance" aria-labelledby="performance-heading"><div className="panel-header"><div><h2 id="performance-heading">SLA по очередям</h2><p>Доля заявок, решённых в срок</p></div></div><div className="performance-list">{result.data.resolutionByQueue.map(({ queue, value }) => <article key={queue.id}><header><span><i style={{ background: queue.color }} />{queue.name}</span><strong>{value}%</strong></header><div className="progress"><span style={{ width: `${value}%`, background: queue.color }} /></div></article>)}</div></section>
      </div>
      <section className="panel insights-panel" aria-labelledby="insights-heading"><div className="panel-header"><div><h2 id="insights-heading">Наблюдения</h2><p>Автоматически собранные сигналы</p></div></div><div className="insight-grid"><article><span className="insight-icon insight-warning">!</span><div><strong>Растёт очередь «Рабочее место»</strong><p>За три дня количество открытых заявок увеличилось на 24%.</p></div></article><article><span className="insight-icon insight-success">✓</span><div><strong>Улучшилось время первого ответа</strong><p>Медиана снизилась с 21 до 18 минут.</p></div></article><article><span className="insight-icon insight-info">i</span><div><strong>Пик обращений — по вторникам</strong><p>Проверьте расписание дежурных на начало недели.</p></div></article></div></section>
    </>
  )
}

