import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <section className="empty-state page-not-found">
      <span className="empty-icon">404</span>
      <h1>Страница не найдена</h1>
      <p>Проверьте адрес или вернитесь в рабочее пространство.</p>
      <Link className="primary-button" to="/dashboard">
        Вернуться к обзору
      </Link>
    </section>
  )
}
