import { relayDeskApi } from '../api/relayDeskApi'
import { ErrorState, LoadingState } from '../components/PageState'
import { PageHeader } from '../components/PageHeader'
import { useAsyncData } from '../hooks/useAsyncData'
import { Link, useSearchParams } from 'react-router-dom'

export function KnowledgeBasePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''
  const category = searchParams.get('c') ?? 'all'
  const result = useAsyncData((signal) => relayDeskApi.getKnowledgeBase(signal), 'knowledge')
  if (result.status === 'loading') return <LoadingState label="Загружаем базу знаний" />
  if (result.status === 'error') return <ErrorState onRetry={result.retry} />

  const categories = [...new Set(result.data.map((article) => article.category))]
  const normalizedQuery = query.trim().toLocaleLowerCase('ru')
  const articles = result.data.filter((article) => {
    const matchesQuery =
      !normalizedQuery ||
      `${article.title} ${article.summary} ${article.category}`.toLocaleLowerCase('ru').includes(normalizedQuery)
    return matchesQuery && (category === 'all' || article.category === category)
  })

  function updateFilter(name: 'c' | 'q', value: string) {
    const next = new URLSearchParams(searchParams)
    if (!value || value.trim() === '' || value === 'all') next.delete(name)
    else next.set(name, value)
    const replace = name === 'q'
    setSearchParams(next, { replace })
  }

  return (
    <>
      <PageHeader
        eyebrow="Помощь сотрудникам"
        title="База знаний"
        description="Инструкции и ответы на частые вопросы о корпоративных сервисах."
      />
      <label className="knowledge-search">
        <span aria-hidden="true">⌕</span>
        <span className="sr-only">Поиск статей</span>
        <input
          value={query}
          onChange={(event) => updateFilter('q', event.target.value)}
          type="search"
          placeholder="Поиск по заголовкам и содержанию"
        />
      </label>
      <div className="knowledge-layout">
        <aside className="category-list">
          <h2>Категории</h2>
          <button
            className={category === 'all' ? 'category-active' : ''}
            type="button"
            onClick={() => updateFilter('c', 'all')}
          >
            Все статьи <span>{result.data.length}</span>
          </button>
          {categories.map((item) => (
            <button
              className={category === item ? 'category-active' : ''}
              type="button"
              key={item}
              onClick={() => updateFilter('c', item)}
            >
              {item}
            </button>
          ))}
        </aside>
        <section className="panel article-list" aria-labelledby="articles-heading">
          <div className="panel-header">
            <div>
              <h2 id="articles-heading">Рекомендуемые статьи</h2>
              <p>Обновляются командой поддержки</p>
            </div>
          </div>
          {articles.length === 0 && (
            <p className="inline-empty" role="status">
              Статьи не найдены. Измените запрос или категорию.
            </p>
          )}
          {articles.map((article) => (
            <article key={article.id}>
              <div>
                <span className="article-category">{article.category}</span>
                <h3>
                  <Link to={`/knowledge/${article.id}`}>{article.title}</Link>
                </h3>
                <p>{article.summary}</p>
              </div>
              <dl>
                <div>
                  <dt>Просмотры</dt>
                  <dd>{article.views.toLocaleString('ru-RU')}</dd>
                </div>
                <div>
                  <dt>Полезность</dt>
                  <dd>{article.helpfulPercent}%</dd>
                </div>
              </dl>
            </article>
          ))}
        </section>
      </div>
    </>
  )
}
