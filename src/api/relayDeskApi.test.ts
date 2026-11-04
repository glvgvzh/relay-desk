import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { relayDeskApi } from './relayDeskApi'
import { tickets } from '../data/fixtures'

describe('relayDeskApi', () => {
  beforeEach(() => relayDeskApi.resetForTests())
  afterEach(() => localStorage.clear())

  it('применяет несколько фильтров к очереди заявок', async () => {
    const result = await relayDeskApi.getTickets({ queueId: 'access', priority: 'high' })

    expect(result.tickets).toHaveLength(1)
    expect(result.tickets[0].id).toBe('RD-142')
  })

  it('фильтрует заявки по неназначенным исполнителям и возвращает только активные заявки', async () => {
    localStorage.setItem(
      'relay-desk:tickets:v1',
      JSON.stringify([...tickets, { ...tickets[0], status: 'resolved', id: 'TEST', assigneeId: null }]),
    )
    relayDeskApi.reloadFromStorageForTests()
    const result = await relayDeskApi.getTickets({ assignee: 'unassigned' })

    expect(result.tickets).toHaveLength(2)
    expect(result.tickets[0].id).toBe('RD-142')
    expect(result.tickets[1].id).toBe('RD-117')
  })

  it('при сброшенном фильтре по исполнителю решенные заявки отображаются', async () => {
    localStorage.setItem(
      'relay-desk:tickets:v1',
      JSON.stringify([...tickets, { ...tickets[0], status: 'resolved', id: 'TEST', assigneeId: null }]),
    )
    relayDeskApi.reloadFromStorageForTests()
    const result = await relayDeskApi.getTickets({ assignee: 'all' })

    expect(result.tickets.length).toBe(11)
    const resolvedTickets = result.tickets.filter((ticket) => ticket.status === 'resolved')
    expect(resolvedTickets.length).toBe(3)
    expect(resolvedTickets.some((ticket) => ticket.id === 'TEST')).toBeTruthy()
  })

  it('возвращает null для неизвестной заявки', async () => {
    await expect(relayDeskApi.getTicket('RD-404')).resolves.toBeNull()
  })

  it('создаёт заявку и добавляет её в начало очереди', async () => {
    const created = await relayDeskApi.createTicket({
      title: 'Нужен доступ к календарю',
      description: 'Добавьте меня в общий календарь команды продаж.',
      requesterName: 'Ирина Волкова',
      requesterEmail: 'irina.volkova@northstar.ru',
      requesterDepartment: 'Продажи',
      organizationId: 'northstar',
      queueId: 'access',
      categoryId: 'software',
      priority: 'medium',
    })

    const result = await relayDeskApi.getTickets()
    expect(result.tickets[0].id).toBe(created.id)
    expect(result.tickets[0].status).toBe('new')
  })

  it('сохраняет ответ и изменения свойств в истории заявки', async () => {
    await relayDeskApi.addReply('RD-142', 'Проверяем вашу SSO-сессию.')
    await relayDeskApi.updateTicket('RD-142', {
      status: 'waiting',
      priority: 'critical',
      queueId: 'workplace',
      categoryId: 'hardware',
      assigneeId: 'agent-1',
    })

    const result = await relayDeskApi.getTicket('RD-142')
    expect(result?.ticket.messages.at(-1)?.body).toBe('Проверяем вашу SSO-сессию.')
    expect(result?.ticket.status).toBe('waiting')
    expect(result?.ticket.assigneeId).toBe('agent-1')
    expect(result?.ticket.activity.some((item) => item.label === 'Назначен исполнитель: Анна Ким')).toBe(true)
  })

  it('сортирует заявки по приоритету', async () => {
    const result = await relayDeskApi.getTickets({ sort: 'priority_desc' })
    expect(result.tickets[0].priority).toBe('critical')
  })

  it('сохраняет созданную заявку после повторной загрузки хранилища', async () => {
    const created = await relayDeskApi.createTicket({
      title: 'Проверить сохранение заявки',
      description: 'Заявка должна пережить повторную загрузку локального состояния.',
      requesterName: 'Ирина Волкова',
      requesterEmail: 'irina@northstar.ru',
      requesterDepartment: 'Продажи',
      organizationId: 'northstar',
      queueId: 'access',
      categoryId: 'software',
      priority: 'medium',
    })
    relayDeskApi.reloadFromStorageForTests()
    const result = await relayDeskApi.getTicket(created.id)
    expect(result?.ticket.title).toBe('Проверить сохранение заявки')
  })

  it('воспроизводимо отклоняет операцию без частичной мутации', async () => {
    const before = await relayDeskApi.getTickets()
    relayDeskApi.failNextForTests('create', 'Контролируемый отказ')
    await expect(
      relayDeskApi.createTicket({
        title: 'Не должна сохраниться',
        description: 'Эта заявка проверяет атомарность отказавшей операции.',
        requesterName: 'Ирина Волкова',
        requesterEmail: 'irina@northstar.ru',
        requesterDepartment: 'Продажи',
        organizationId: 'northstar',
        queueId: 'access',
        categoryId: 'software',
        priority: 'medium',
      }),
    ).rejects.toThrow('Контролируемый отказ')
    const after = await relayDeskApi.getTickets()
    expect(after.total).toBe(before.total)
  })

  it('ограничивает назначение заявки для первой линии', async () => {
    relayDeskApi.setCurrentUserForTests('agent-1')
    await expect(
      relayDeskApi.updateTicket('RD-142', {
        status: 'in_progress',
        priority: 'high',
        queueId: 'access',
        categoryId: 'identity',
        assigneeId: 'agent-2',
      }),
    ).rejects.toThrow('только на себя')
    await expect(
      relayDeskApi.updateTicket('RD-142', {
        status: 'in_progress',
        priority: 'high',
        queueId: 'access',
        categoryId: 'identity',
        assigneeId: 'agent-1',
      }),
    ).resolves.toBeTruthy()
  })

  it('вычисляет сводку, очереди и отчёт из одного состояния', async () => {
    const [dashboard, report, list] = await Promise.all([
      relayDeskApi.getDashboard(),
      relayDeskApi.getReports(),
      relayDeskApi.getTickets(),
    ])
    expect(dashboard.queueStats.reduce((sum, queue) => sum + queue.activeTickets, 0)).toBe(report.activeTickets)
    expect(report.totalTickets).toBe(list.total)
    expect(dashboard.metrics.unassigned).toBe(report.unassignedTickets)
  })

  it('согласует показатель просроченных заявок с SLA-фильтром', async () => {
    const [dashboard, overdueList] = await Promise.all([
      relayDeskApi.getDashboard(),
      relayDeskApi.getTickets({ sla: 'overdue' }),
    ])

    expect(overdueList.total).toBe(dashboard.metrics.overdue)
    expect(overdueList.tickets.every((ticket) => ticket.status !== 'resolved')).toBe(true)
    expect(overdueList.tickets.some((ticket) => ticket.id === 'RD-119')).toBe(false)
  })

  it('различает публичное сообщение и внутреннюю заметку в контракте', async () => {
    await relayDeskApi.addReply('RD-142', 'Только для команды', true)
    const result = await relayDeskApi.getTicket('RD-142')
    expect(result?.ticket.messages.at(-1)).toMatchObject({ body: 'Только для команды', visibility: 'internal' })
  })

  it('отменяет чтение через AbortSignal', async () => {
    const controller = new AbortController()
    const pending = relayDeskApi.getTickets({}, controller.signal)
    controller.abort()
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('отклоняет несогласованную категорию при создании', async () => {
    await expect(
      relayDeskApi.createTicket({
        title: 'Проверить категорию',
        description: 'Категория должна относиться к выбранной очереди.',
        requesterName: 'Ирина Волкова',
        requesterEmail: 'irina@northstar.ru',
        requesterDepartment: 'Продажи',
        organizationId: 'northstar',
        queueId: 'finance',
        categoryId: 'hardware',
        priority: 'medium',
      }),
    ).rejects.toThrow('Категория не относится')
  })

  it('не сохраняет несогласованную категорию при редактировании', async () => {
    await expect(
      relayDeskApi.updateTicket('RD-142', {
        status: 'in_progress',
        priority: 'high',
        queueId: 'finance',
        categoryId: 'identity',
        assigneeId: 'agent-5',
      }),
    ).rejects.toThrow('Категория не относится')
    const result = await relayDeskApi.getTicket('RD-142')
    expect(result?.ticket.queueId).toBe('access')
  })
})
