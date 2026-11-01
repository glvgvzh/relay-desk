import { Link, useParams } from 'react-router-dom'
import { relayDeskApi } from '../api/relayDeskApi'
import { ErrorState, LoadingState } from '../components/PageState'
import { useAsyncData } from '../hooks/useAsyncData'

export function KnowledgeArticlePage() {
  const { articleId = '' } = useParams()
  const result = useAsyncData((signal) => relayDeskApi.getKnowledgeArticle(articleId, signal), `knowledge:${articleId}`)
  if (result.status === 'loading') return <LoadingState label="Открываем инструкцию" />
  if (result.status === 'error') return <ErrorState message="Не удалось загрузить инструкцию." />
  if (!result.data)
    return (
      <section className="empty-state">
        <h1>Статья не найдена</h1>
        <p>Возможно, ссылка устарела.</p>
        <Link className="primary-button" to="/knowledge">
          К базе знаний
        </Link>
      </section>
    )
  const article = result.data
  return (
    <article className="knowledge-article">
      <div className="breadcrumbs">
        <Link to="/knowledge">База знаний</Link>
        <span>/</span>
        <span>{article.category}</span>
      </div>
      <header>
        <span className="article-category">{article.category}</span>
        <h1>{article.title}</h1>
        <p>{article.lead}</p>
        <small>
          Обновлено {new Date(article.updatedAt).toLocaleDateString('ru-RU')} · Полезно {article.helpfulPercent}%
          читателей
        </small>
      </header>
      <div className="panel article-content">
        {article.sections.map((section) => (
          <section key={section.heading}>
            <h2>{section.heading}</h2>
            <p>{section.body}</p>
          </section>
        ))}
      </div>
      <footer className="article-footer">
        <p>Инструкция не помогла?</p>
        <Link className="primary-button" to="/tickets/new">
          Создать заявку
        </Link>
      </footer>
    </article>
  )
}
