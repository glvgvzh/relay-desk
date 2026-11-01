import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { relayDeskApi } from '../api/relayDeskApi'
import { PageHeader } from '../components/PageHeader'
import type { TicketPriority } from '../domain/types'

export function CreateTicketPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setError('')
    const formData = new FormData(event.currentTarget)
    try {
      const ticket = await relayDeskApi.createTicket({
        title: String(formData.get('title')),
        description: String(formData.get('description')),
        requesterName: String(formData.get('requesterName')),
        requesterEmail: String(formData.get('requesterEmail')),
        requesterDepartment: String(formData.get('requesterDepartment')),
        queueId: String(formData.get('queueId')),
        priority: String(formData.get('priority')) as TicketPriority,
        serviceId: searchParams.get('service') ?? undefined,
      })
      navigate(`/tickets/${ticket.id}`, { replace: true })
    } catch {
      setError('Не удалось создать заявку. Повторите попытку.')
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <div className="breadcrumbs"><Link to="/tickets">Заявки</Link><span>/</span><span>Новая заявка</span></div>
      <PageHeader eyebrow="Новое обращение" title="Создать заявку" description="Опишите запрос и укажите автора. После создания заявка появится в общей очереди." />
      <form className="panel ticket-form" onSubmit={submit}>
        {error && <div className="form-error" role="alert">{error}</div>}
        <div className="form-grid">
          <label className="form-field form-field-wide"><span>Тема</span><input name="title" required minLength={5} placeholder="Кратко опишите запрос" /></label>
          <label className="form-field form-field-wide"><span>Описание</span><textarea name="description" required minLength={10} rows={6} placeholder="Что произошло и какой результат нужен?" /></label>
          <label className="form-field"><span>Автор</span><input name="requesterName" required placeholder="Имя и фамилия" /></label>
          <label className="form-field"><span>Рабочая почта</span><input name="requesterEmail" required type="email" placeholder="name@company.ru" /></label>
          <label className="form-field"><span>Подразделение</span><input name="requesterDepartment" required placeholder="Например, Маркетинг" /></label>
          <label className="form-field"><span>Очередь</span><select name="queueId" defaultValue="access"><option value="access">Доступы и учётные записи</option><option value="workplace">Рабочее место</option><option value="finance">Финансы и документы</option><option value="people">Сотрудники и офис</option></select></label>
          <label className="form-field"><span>Приоритет</span><select name="priority" defaultValue="medium"><option value="low">Низкий</option><option value="medium">Средний</option><option value="high">Высокий</option><option value="critical">Критический</option></select></label>
        </div>
        <footer className="form-actions"><Link className="secondary-button" to="/tickets">Отмена</Link><button className="primary-button" disabled={isSubmitting} type="submit">{isSubmitting ? 'Создаём…' : 'Создать заявку'}</button></footer>
      </form>
    </>
  )
}
