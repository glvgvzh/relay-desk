import { useRef, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { relayDeskApi } from '../api/relayDeskApi'
import { ErrorState, LoadingState } from '../components/PageState'
import { PriorityBadge, StatusBadge } from '../components/StatusBadge'
import { formatRelativeDate, priorityLabels, statusLabels } from '../domain/labels'
import type { TicketPriority, TicketStatus } from '../domain/types'
import { useAsyncData } from '../hooks/useAsyncData'

export function TicketDetailsPage() {
  const { ticketId = '' } = useParams()
  const [revision, setRevision] = useState(0)
  const [reply, setReply] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [replyError, setReplyError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const replyRef = useRef<HTMLTextAreaElement>(null)
  const result = useAsyncData((signal) => relayDeskApi.getTicket(ticketId, signal), `ticket:${ticketId}:${revision}`)

  async function submitReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setReplyError('')
    if (!reply.trim()) {
      setReplyError('Введите текст сообщения.')
      replyRef.current?.focus()
      return
    }
    setIsSending(true)
    try {
      await relayDeskApi.addReply(ticketId, reply, isInternal)
      setReply('')
      setIsInternal(false)
      setRevision((value) => value + 1)
    } catch {
      setReplyError('Не удалось сохранить сообщение. Повторите попытку.')
    } finally {
      setIsSending(false)
    }
  }

  async function saveProperties(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    setIsSaving(true)
    try {
      await relayDeskApi.updateTicket(ticketId, {
        status: String(formData.get('status')) as TicketStatus,
        priority: String(formData.get('priority')) as TicketPriority,
        queueId: String(formData.get('queueId')),
        assigneeId: String(formData.get('assigneeId')) || null,
      })
      setIsEditing(false)
      setRevision((value) => value + 1)
    } finally {
      setIsSaving(false)
    }
  }

  if (result.status === 'loading') return <LoadingState label="Открываем заявку" />
  if (result.status === 'error') return <ErrorState />
  if (!result.data) return <TicketNotFound />

  const { ticket, queues, agents } = result.data
  const queue = queues.find((item) => item.id === ticket.queueId)
  const assignee = agents.find((agent) => agent.id === ticket.assigneeId)

  return (
    <>
      <div className="breadcrumbs"><Link to="/tickets">Заявки</Link><span>/</span><span>{ticket.id}</span></div>
      <header className="ticket-detail-header">
        <div>
          <div className="ticket-meta-line"><span>{ticket.id}</span><StatusBadge status={ticket.status} /><PriorityBadge priority={ticket.priority} /></div>
          <h1>{ticket.title}</h1>
          <p>Создана {formatRelativeDate(ticket.createdAt)} · обновлена {formatRelativeDate(ticket.updatedAt)}</p>
        </div>
        <div className="page-actions"><button className="primary-button" type="button" onClick={() => replyRef.current?.focus()}>Ответить</button></div>
      </header>

      <div className="ticket-detail-grid">
        <div className="ticket-detail-main">
          <section className="panel ticket-description" aria-labelledby="description-heading">
            <h2 id="description-heading">Описание</h2>
            <p>{ticket.description}</p>
            <div className="tag-list">{ticket.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
          </section>

          <section className="panel conversation" aria-labelledby="conversation-heading">
            <div className="panel-header"><div><h2 id="conversation-heading">Переписка</h2><p>{ticket.messages.length} сообщений</p></div></div>
            <div className="message-list">
              {ticket.messages.length === 0 && <p className="muted conversation-empty">В заявке пока нет сообщений.</p>}
              {ticket.messages.map((message) => (
                <article className={`message message-${message.authorRole}`} key={message.id}>
                  <span className="avatar avatar-small">{message.author.split(' ').map((part) => part[0]).join('')}</span>
                  <div><header><strong>{message.author}</strong><time dateTime={message.createdAt}>{formatRelativeDate(message.createdAt)}</time></header><p>{message.body}</p></div>
                </article>
              ))}
            </div>
            <form className="reply-box" onSubmit={submitReply}>
              <label htmlFor="reply">{isInternal ? 'Внутренняя заметка' : 'Ответ сотруднику'}</label>
              <textarea ref={replyRef} id="reply" rows={4} value={reply} onChange={(event) => setReply(event.target.value)} placeholder={isInternal ? 'Заметку увидит только команда поддержки' : 'Введите сообщение…'} />
              {replyError && <p className="field-error" role="alert">{replyError}</p>}
              <footer><button className="text-button" type="button" onClick={() => setIsInternal((value) => !value)}>{isInternal ? 'Ответ сотруднику' : 'Добавить внутреннюю заметку'}</button><button className="primary-button" disabled={isSending} type="submit">{isSending ? 'Сохраняем…' : isInternal ? 'Сохранить заметку' : 'Отправить ответ'}</button></footer>
            </form>
          </section>
        </div>

        <aside className="ticket-sidebar">
          <section className="panel properties-card" aria-labelledby="properties-heading">
            <div className="panel-header"><h2 id="properties-heading">Свойства</h2><button className="text-button" type="button" onClick={() => setIsEditing((value) => !value)}>{isEditing ? 'Отмена' : 'Изменить'}</button></div>
            {isEditing ? (
              <form className="property-form" onSubmit={saveProperties}>
                <label><span>Статус</span><select name="status" defaultValue={ticket.status}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <label><span>Приоритет</span><select name="priority" defaultValue={ticket.priority}>{Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <label><span>Очередь</span><select name="queueId" defaultValue={ticket.queueId}>{queues.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                <label><span>Исполнитель</span><select name="assigneeId" defaultValue={ticket.assigneeId ?? ''}><option value="">Не назначен</option>{agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}</select></label>
                <button className="primary-button" disabled={isSaving} type="submit">{isSaving ? 'Сохраняем…' : 'Сохранить'}</button>
              </form>
            ) : (
              <dl>
                <div><dt>Статус</dt><dd><StatusBadge status={ticket.status} /></dd></div>
                <div><dt>Приоритет</dt><dd><PriorityBadge priority={ticket.priority} /></dd></div>
                <div><dt>Очередь</dt><dd><span className="queue-dot" style={{ background: queue?.color }} />{queue?.name}</dd></div>
                <div><dt>Исполнитель</dt><dd>{assignee ? <span className="assignee"><span className="avatar avatar-small">{assignee.avatar}</span>{assignee.name}</span> : 'Не назначен'}</dd></div>
                <div><dt>Срок SLA</dt><dd className="sla-value"><strong>{new Date(ticket.slaDueAt).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</strong></dd></div>
              </dl>
            )}
          </section>

          <section className="panel requester-card" aria-labelledby="requester-heading">
            <div className="panel-header"><h2 id="requester-heading">Автор заявки</h2></div>
            <div className="requester-profile"><span className="avatar avatar-large">{ticket.requester.avatar}</span><div><strong>{ticket.requester.name}</strong><span>{ticket.requester.department}</span><a href={`mailto:${ticket.requester.email}`}>{ticket.requester.email}</a></div></div>
          </section>

          <section className="panel activity-card" aria-labelledby="activity-heading">
            <div className="panel-header"><h2 id="activity-heading">История</h2></div>
            {ticket.activity.length === 0 ? <p className="muted activity-empty">История изменений пока пуста.</p> : <ol>{ticket.activity.map((item) => <li key={item.id}><span /><div><p>{item.label}</p><time dateTime={item.createdAt}>{formatRelativeDate(item.createdAt)}</time></div></li>)}</ol>}
          </section>
        </aside>
      </div>
    </>
  )
}

function TicketNotFound() {
  return <section className="empty-state"><span className="empty-icon">404</span><h1>Заявка не найдена</h1><p>Возможно, она была удалена или у вас нет к ней доступа.</p><Link className="primary-button" to="/tickets">Вернуться к заявкам</Link></section>
}

