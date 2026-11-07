import { useRef, useState, type FormEvent } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { relayDeskApi } from '../api/relayDeskApi'
import { ErrorState, LoadingState } from '../components/PageState'
import { PriorityBadge, StatusBadge } from '../components/StatusBadge'
import { formatRelativeDate, priorityLabels, statusLabels } from '../domain/labels'
import type { TicketPriority, TicketStatus } from '../domain/types'
import { useAsyncData } from '../hooks/useAsyncData'

export function TicketDetailsPage() {
  const { ticketId = '' } = useParams()
  const location = useLocation()
  const [revision, setRevision] = useState(0)
  const [reply, setReply] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [replyError, setReplyError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editingQueueId, setEditingQueueId] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [propertyError, setPropertyError] = useState('')
  const [notice, setNotice] = useState((location.state as { notice?: string } | null)?.notice ?? '')
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
      setNotice(isInternal ? 'Внутренняя заметка сохранена.' : 'Ответ отправлен сотруднику.')
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
    setPropertyError('')
    try {
      await relayDeskApi.updateTicket(ticketId, {
        status: String(formData.get('status')) as TicketStatus,
        priority: String(formData.get('priority')) as TicketPriority,
        queueId: String(formData.get('queueId')),
        categoryId: String(formData.get('categoryId')),
        assigneeId: String(formData.get('assigneeId')) || null,
      })
      setIsEditing(false)
      setNotice('Свойства заявки сохранены.')
      setRevision((value) => value + 1)
    } catch (caught) {
      setPropertyError(caught instanceof Error ? caught.message : 'Не удалось сохранить свойства заявки.')
    } finally {
      setIsSaving(false)
    }
  }

  if (result.status === 'loading') return <LoadingState label="Открываем заявку" />
  if (result.status === 'error') return <ErrorState onRetry={result.retry} />
  if (!result.data) return <TicketNotFound />

  const { ticket, queues, agents, categories, organizations, currentUser, canAssignAny } = result.data
  const queue = queues.find((item) => item.id === ticket.queueId)
  const assignee = agents.find((agent) => agent.id === ticket.assigneeId)
  const category = categories.find((item) => item.id === ticket.categoryId)
  const organization = organizations.find((item) => item.id === ticket.requester.organizationId)
  const assignableAgents = canAssignAny
    ? agents
    : agents.filter((agent) => agent.id === currentUser.id || agent.id === ticket.assigneeId)
  const selectedEditingQueueId = editingQueueId || ticket.queueId
  const editingCategories = categories.filter((item) => item.queueId === selectedEditingQueueId)
  const editingCategoryId = editingCategories.some((item) => item.id === ticket.categoryId)
    ? ticket.categoryId
    : editingCategories[0]?.id

  function toggleEditing() {
    setPropertyError('')
    if (!isEditing) setEditingQueueId(ticket.queueId)
    setIsEditing((value) => !value)
  }

  return (
    <>
      <div className="breadcrumbs">
        <Link to="/tickets">Заявки</Link>
        <span>/</span>
        <span>{ticket.id}</span>
      </div>
      {notice && (
        <div className="operation-notice" role="status">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice('')} aria-label="Скрыть уведомление">
            ×
          </button>
        </div>
      )}
      <header className="ticket-detail-header">
        <div>
          <div className="ticket-meta-line">
            <span>{ticket.id}</span>
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
          </div>
          <h1>{ticket.title}</h1>
          <p>
            Создана {formatRelativeDate(ticket.createdAt)} · обновлена {formatRelativeDate(ticket.updatedAt)}
          </p>
        </div>
        <div className="page-actions">
          <button className="primary-button" type="button" onClick={() => replyRef.current?.focus()}>
            Ответить
          </button>
        </div>
      </header>

      <div className="ticket-detail-grid">
        <div className="ticket-detail-main">
          <section className="panel ticket-description" aria-labelledby="description-heading">
            <h2 id="description-heading">Описание</h2>
            <p>{ticket.description}</p>
            <div className="tag-list">
              {ticket.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          </section>

          <section className="panel conversation" aria-labelledby="conversation-heading">
            <div className="panel-header">
              <div>
                <h2 id="conversation-heading">Переписка</h2>
                <p>{ticket.messages.length} сообщений</p>
              </div>
            </div>
            <div className="message-list">
              {ticket.messages.length === 0 && <p className="muted conversation-empty">В заявке пока нет сообщений.</p>}
              {ticket.messages.map((message) => (
                <article
                  className={`message message-${message.authorRole} ${message.visibility === 'internal' ? 'message-internal' : ''}`}
                  key={message.id}
                >
                  <span className="avatar avatar-small">
                    {message.author
                      .split(' ')
                      .map((part) => part[0])
                      .join('')}
                  </span>
                  <div>
                    <header>
                      <strong>
                        {message.author}
                        {message.visibility === 'internal' && (
                          <span className="internal-label">Внутренняя заметка</span>
                        )}
                      </strong>
                      <time dateTime={message.createdAt}>{formatRelativeDate(message.createdAt)}</time>
                    </header>
                    <p>{message.body}</p>
                  </div>
                </article>
              ))}
            </div>
            <form className="reply-box" onSubmit={submitReply}>
              <label htmlFor="reply">{isInternal ? 'Внутренняя заметка' : 'Ответ сотруднику'}</label>
              <textarea
                ref={replyRef}
                id="reply"
                rows={4}
                value={reply}
                onChange={(event) => setReply(event.target.value)}
                placeholder={isInternal ? 'Заметку увидит только команда поддержки' : 'Введите сообщение…'}
              />
              {replyError && (
                <p className="field-error" role="alert">
                  {replyError}
                </p>
              )}
              <footer>
                <button className="text-button" type="button" onClick={() => setIsInternal((value) => !value)}>
                  {isInternal ? 'Ответ сотруднику' : 'Добавить внутреннюю заметку'}
                </button>
                <button className="primary-button" disabled={isSending} type="submit">
                  {isSending ? 'Сохраняем…' : isInternal ? 'Сохранить заметку' : 'Отправить ответ'}
                </button>
              </footer>
            </form>
          </section>
        </div>

        <aside className="ticket-sidebar">
          <section className="panel properties-card" aria-labelledby="properties-heading">
            <div className="panel-header">
              <h2 id="properties-heading">Свойства</h2>
              <button className="text-button" type="button" onClick={toggleEditing}>
                {isEditing ? 'Отмена' : 'Изменить'}
              </button>
            </div>
            {isEditing ? (
              <form className="property-form" onSubmit={saveProperties}>
                <label>
                  <span>Статус</span>
                  <select name="status" defaultValue={ticket.status}>
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Приоритет</span>
                  <select name="priority" defaultValue={ticket.priority}>
                    {Object.entries(priorityLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Очередь</span>
                  <select
                    name="queueId"
                    value={selectedEditingQueueId}
                    onChange={(event) => setEditingQueueId(event.target.value)}
                  >
                    {queues.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Категория</span>
                  <select name="categoryId" defaultValue={editingCategoryId} key={selectedEditingQueueId}>
                    {editingCategories.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Исполнитель</span>
                  <select name="assigneeId" defaultValue={ticket.assigneeId ?? ''}>
                    <option value="">Не назначен</option>
                    {assignableAgents.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name}
                      </option>
                    ))}
                  </select>
                </label>
                {propertyError && (
                  <p className="field-error" role="alert">
                    {propertyError}
                  </p>
                )}
                <button className="primary-button" disabled={isSaving} type="submit">
                  {isSaving ? 'Сохраняем…' : 'Сохранить'}
                </button>
              </form>
            ) : (
              <dl>
                <div>
                  <dt>Статус</dt>
                  <dd>
                    <StatusBadge status={ticket.status} />
                  </dd>
                </div>
                <div>
                  <dt>Приоритет</dt>
                  <dd>
                    <PriorityBadge priority={ticket.priority} />
                  </dd>
                </div>
                <div>
                  <dt>Очередь</dt>
                  <dd>
                    <span className="queue-dot" style={{ background: queue?.color }} />
                    {queue?.name}
                  </dd>
                </div>
                <div>
                  <dt>Категория</dt>
                  <dd>{category?.name}</dd>
                </div>
                <div>
                  <dt>Исполнитель</dt>
                  <dd>
                    {assignee ? (
                      <span className="assignee">
                        <span className="avatar avatar-small">{assignee.avatar}</span>
                        {assignee.name}
                      </span>
                    ) : (
                      'Не назначен'
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Срок SLA</dt>
                  <dd className="sla-value">
                    <strong>
                      {new Date(ticket.slaDueAt).toLocaleString('ru-RU', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </strong>
                  </dd>
                </div>
              </dl>
            )}
          </section>

          <section className="panel requester-card" aria-labelledby="requester-heading">
            <div className="panel-header">
              <h2 id="requester-heading">Автор заявки</h2>
            </div>
            <div className="requester-profile">
              <span className="avatar avatar-large">{ticket.requester.avatar}</span>
              <div>
                <strong>{ticket.requester.name}</strong>
                <span>
                  {organization?.name} · {ticket.requester.department}
                </span>
                <a href={`mailto:${ticket.requester.email}`}>{ticket.requester.email}</a>
              </div>
            </div>
          </section>

          <section className="panel activity-card" aria-labelledby="activity-heading">
            <div className="panel-header">
              <h2 id="activity-heading">История</h2>
            </div>
            {ticket.activity.length === 0 ? (
              <p className="muted activity-empty">История изменений пока пуста.</p>
            ) : (
              <ol>
                {ticket.activity.map((item) => (
                  <li key={item.id}>
                    <span />
                    <div>
                      <p>{item.label}</p>
                      <time dateTime={item.createdAt}>{formatRelativeDate(item.createdAt)}</time>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </aside>
      </div>
    </>
  )
}

function TicketNotFound() {
  return (
    <section className="empty-state">
      <span className="empty-icon">404</span>
      <h1>Заявка не найдена</h1>
      <p>Возможно, она была удалена или у вас нет к ней доступа.</p>
      <Link className="primary-button" to="/tickets">
        Вернуться к заявкам
      </Link>
    </section>
  )
}
