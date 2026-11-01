import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { App } from './App'
import { relayDeskApi } from './api/relayDeskApi'

function renderRoute(route: string) {
  return render(<MemoryRouter initialEntries={[route]}><App /></MemoryRouter>)
}

describe('Relay Desk', () => {
  beforeEach(() => relayDeskApi.resetForTests())

  it('показывает продуктовую сводку', async () => {
    renderRoute('/dashboard')

    expect(await screen.findByRole('heading', { name: /доброе утро/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /последние заявки/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /команда на линии/i })).toBeInTheDocument()
  })

  it('фильтрует очередь заявок по поисковому запросу', async () => {
    const user = userEvent.setup()
    renderRoute('/tickets')

    const search = await screen.findByRole('searchbox', { name: /поиск заявок/i })
    await user.type(search, 'Wi-Fi')
    await user.click(screen.getByRole('button', { name: /найти/i }))

    expect(await screen.findByRole('link', { name: /не работает гостевой wi-fi/i })).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('link', { name: /порталу расходов/i })).not.toBeInTheDocument())
  })

  it('открывает детальную карточку заявки', async () => {
    renderRoute('/tickets/RD-142')

    expect(await screen.findByRole('heading', { name: /нет доступа к порталу расходов/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /переписка/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /свойства/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /marina\.li/i })).toBeInTheDocument()
  })

  it('показывает страницу для неизвестного маршрута', () => {
    renderRoute('/missing')
    expect(screen.getByRole('heading', { name: /страница не найдена/i })).toBeInTheDocument()
  })

  it('создаёт заявку из доступной формы и открывает её карточку', async () => {
    const user = userEvent.setup()
    renderRoute('/tickets/new')

    await user.type(screen.getByLabelText('Тема'), 'Подключить общий календарь')
    await user.type(screen.getByLabelText('Описание'), 'Нужен доступ к календарю команды продаж.')
    await user.type(screen.getByLabelText('Автор'), 'Ирина Волкова')
    await user.type(screen.getByLabelText('Рабочая почта'), 'irina.volkova@northstar.ru')
    await user.type(screen.getByLabelText('Подразделение'), 'Продажи')
    await user.click(screen.getByRole('button', { name: 'Создать заявку' }))

    expect(await screen.findByRole('heading', { name: 'Подключить общий календарь' })).toBeInTheDocument()
    expect(screen.getByText('Ирина Волкова')).toBeInTheDocument()
  })

  it('отправляет ответ сотруднику и отражает его в переписке', async () => {
    const user = userEvent.setup()
    renderRoute('/tickets/RD-142')

    const reply = await screen.findByLabelText('Ответ сотруднику')
    await user.type(reply, 'Проверяем вашу SSO-сессию.')
    await user.click(screen.getByRole('button', { name: 'Отправить ответ' }))

    expect(await screen.findByText('Проверяем вашу SSO-сессию.', { selector: '.message p' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getAllByText('В работе', { selector: '.badge' }).length).toBeGreaterThan(0))
  })

  it('изменяет свойства заявки и добавляет событие в историю', async () => {
    const user = userEvent.setup()
    renderRoute('/tickets/RD-142')

    await user.click(await screen.findByRole('button', { name: 'Изменить' }))
    await user.selectOptions(screen.getByLabelText('Статус'), 'waiting')
    await user.selectOptions(screen.getByLabelText('Исполнитель'), 'agent-1')
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))

    await waitFor(() => expect(screen.getAllByText('Ожидает ответа', { selector: '.badge' }).length).toBeGreaterThan(0))
    expect(screen.getByText('Назначен исполнитель: Анна Ким')).toBeInTheDocument()
  })
})

