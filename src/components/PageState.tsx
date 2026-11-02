import type { ReactNode } from 'react'

export function LoadingState({ label = 'Загружаем данные' }: { label?: string }) {
  return (
    <div className="loading-state" role="status">
      <span className="spinner" aria-hidden="true" />
      <span>{label}…</span>
    </div>
  )
}

export function ErrorState({ message = 'Не удалось загрузить данные.' }: { message?: string }) {
  return (
    <div className="error-state" role="alert">
      <strong>Что-то пошло не так</strong>
      <p>{message}</p>
      <button className="secondary-button" type="button" onClick={() => window.location.reload()}>
        Повторить
      </button>
    </div>
  )
}

export function EmptyState({ title, description }: { title: string; description: ReactNode }) {
  return (
    <div className="empty-state">
      <span className="empty-icon" aria-hidden="true">
        ⌕
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  )
}
