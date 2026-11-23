import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useBlocker, useNavigate, useSearchParams, type BlockerFunction } from 'react-router-dom'
import { relayDeskApi } from '../api/relayDeskApi'
import { ErrorState, LoadingState } from '../components/PageState'
import { PageHeader } from '../components/PageHeader'
import type { TicketPriority } from '../domain/types'
import { useAsyncData } from '../hooks/useAsyncData'

export function CreateTicketPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const serviceId = searchParams.get('service') ?? undefined
  const formDataResult = useAsyncData(
    (signal) => relayDeskApi.getCreateTicketForm(serviceId, signal),
    `create-form:${serviceId ?? 'manual'}`,
  )
  const [queueId, setQueueId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const isTicketCreated = useRef(false)
  const modalRef = useRef<HTMLDialogElement>(null)
  const initialSnapshotRef = useRef<string>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const shouldBlock: BlockerFunction = ({ currentLocation, nextLocation }) => {
    return currentLocation.pathname !== nextLocation.pathname && hasUnsavedChanges && !isTicketCreated.current
  }
  const blocker = useBlocker(shouldBlock)

  useEffect(() => {
    function handleReload(event: BeforeUnloadEvent) {
      if (!hasUnsavedChanges) return
      event.preventDefault()
    }
    window.addEventListener('beforeunload', handleReload)
    return () => window.removeEventListener('beforeunload', handleReload)
  }, [hasUnsavedChanges])

  useEffect(() => {
    const modal = modalRef.current
    if (blocker.state === 'blocked' && modal && !modal.open) {
      modal?.showModal()
    }
  }, [blocker.state])

  if (formDataResult.status === 'loading') return <LoadingState label="Подготавливаем форму" />
  if (formDataResult.status === 'error')
    return <ErrorState message="Не удалось загрузить справочники для заявки." onRetry={formDataResult.retry} />

  const { service, queues, categories, organizations } = formDataResult.data
  const selectedQueueId = queueId ?? service?.queueId ?? 'access'
  const visibleCategories = categories.filter((category) => category.queueId === selectedQueueId)
  const defaultCategoryId = service?.queueId === selectedQueueId ? service.categoryId : visibleCategories[0]?.id

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setError('')
    const values = new FormData(event.currentTarget)
    try {
      const ticket = await relayDeskApi.createTicket({
        title: String(values.get('title')),
        description: String(values.get('description')),
        requesterName: String(values.get('requesterName')),
        requesterEmail: String(values.get('requesterEmail')),
        requesterDepartment: String(values.get('requesterDepartment')),
        organizationId: String(values.get('organizationId')),
        queueId: String(values.get('queueId')),
        categoryId: String(values.get('categoryId')),
        priority: String(values.get('priority')) as TicketPriority,
        serviceId,
      })
      isTicketCreated.current = true
      navigate(`/tickets/${ticket.id}`, { replace: true, state: { notice: 'Заявка создана и добавлена в очередь.' } })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не удалось создать заявку. Повторите попытку.')
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <dialog
        className="modal"
        id="modal"
        aria-modal="true"
        aria-labelledby="unsaved-changes"
        ref={modalRef}
        onCancel={(e) => {
          e.preventDefault()
          blocker.reset!()
          modalRef.current?.close()
        }}
      >
        <h2 id="unsaved-changes">У вас остались несохраненные изменения. Покинуть страницу?</h2>
        <div className="modal-actions">
          <button
            className="primary-button"
            onClick={() => {
              blocker.reset!()
              modalRef.current?.close()
            }}
          >
            Остаться
          </button>
          <button
            className="secondary-button"
            onClick={() => {
              blocker.proceed!()
              modalRef.current?.close()
            }}
          >
            Уйти
          </button>
        </div>
      </dialog>
      <div className="breadcrumbs">
        <Link to={service ? '/catalog' : '/tickets'}>{service ? 'Каталог услуг' : 'Заявки'}</Link>
        <span>/</span>
        <span>Новая заявка</span>
      </div>
      <PageHeader
        eyebrow="Новое обращение"
        title="Создать заявку"
        description="Опишите запрос и укажите автора. После создания заявка появится во всех связанных разделах."
      />
      <form
        className="panel ticket-form"
        onSubmit={submit}
        ref={(form) => {
          if (!form) return
          const formData = new FormData(form)
          if (!initialSnapshotRef.current) {
            initialSnapshotRef.current = JSON.stringify([...formData.entries()])
          }
        }}
        onChange={(event) => {
          const formData = new FormData(event.currentTarget)
          setHasUnsavedChanges(JSON.stringify([...formData.entries()]) !== initialSnapshotRef.current)
        }}
      >
        {service && (
          <section className="selected-service" aria-label="Выбранная услуга">
            <span className="service-icon" aria-hidden="true">
              {service.icon}
            </span>
            <div>
              <small>Выбранная услуга</small>
              <strong>{service.title}</strong>
              <p>
                {service.description} Срок: {service.deliveryTime}.
              </p>
            </div>
          </section>
        )}
        {serviceId && !service && (
          <div className="form-error" role="alert">
            Услуга не найдена. Выберите услугу заново или заполните обычную заявку.
          </div>
        )}
        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}
        <div className="form-grid">
          <label className="form-field form-field-wide">
            <span>Тема</span>
            <input
              name="title"
              required
              minLength={5}
              defaultValue={service?.requestTitle}
              placeholder="Кратко опишите запрос"
            />
          </label>
          <label className="form-field form-field-wide">
            <span>Описание</span>
            <textarea
              name="description"
              required
              minLength={10}
              rows={6}
              defaultValue={service?.requestDescription}
              placeholder="Что произошло и какой результат нужен?"
            />
          </label>
          <label className="form-field">
            <span>Автор</span>
            <input name="requesterName" required placeholder="Имя и фамилия" />
          </label>
          <label className="form-field">
            <span>Рабочая почта</span>
            <input name="requesterEmail" required type="email" placeholder="name@company.ru" />
          </label>
          <label className="form-field">
            <span>Организация</span>
            <select name="organizationId" defaultValue="northstar">
              {organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Подразделение</span>
            <input name="requesterDepartment" required placeholder="Например, Маркетинг" />
          </label>
          <label className="form-field">
            <span>Очередь</span>
            <select name="queueId" value={selectedQueueId} onChange={(event) => setQueueId(event.target.value)}>
              {queues.map((queue) => (
                <option key={queue.id} value={queue.id}>
                  {queue.name}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Категория</span>
            <select
              name="categoryId"
              defaultValue={defaultCategoryId}
              key={`${selectedQueueId}:${service?.categoryId ?? ''}`}
            >
              {visibleCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Приоритет</span>
            <select name="priority" defaultValue={service?.defaultPriority ?? 'medium'}>
              <option value="low">Низкий</option>
              <option value="medium">Средний</option>
              <option value="high">Высокий</option>
              <option value="critical">Критический</option>
            </select>
          </label>
        </div>
        <footer className="form-actions">
          <Link className="secondary-button" to={service ? '/catalog' : '/tickets'}>
            Отмена
          </Link>
          <button className="primary-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Создаём…' : 'Создать заявку'}
          </button>
        </footer>
      </form>
    </>
  )
}
