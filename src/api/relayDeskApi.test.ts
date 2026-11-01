import { beforeEach, describe, expect, it } from 'vitest'
import { relayDeskApi } from './relayDeskApi'

describe('relayDeskApi', () => {
  beforeEach(() => relayDeskApi.resetForTests())

  it('применяет несколько фильтров к очереди заявок', async () => {
    const result = await relayDeskApi.getTickets({ queueId: 'access', priority: 'high' })

    expect(result.tickets).toHaveLength(1)
    expect(result.tickets[0].id).toBe('RD-142')
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
      queueId: 'access',
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
      assigneeId: 'agent-1',
    })

    const result = await relayDeskApi.getTicket('RD-142')
    expect(result?.ticket.messages.at(-1)?.body).toBe('Проверяем вашу SSO-сессию.')
    expect(result?.ticket.status).toBe('waiting')
    expect(result?.ticket.assigneeId).toBe('agent-1')
    expect(result?.ticket.activity.some((item) => item.label === 'Назначен исполнитель: Анна Ким')).toBe(true)
  })
})

