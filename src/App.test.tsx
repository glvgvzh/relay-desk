import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'
import { relayDeskApi } from './api/relayDeskApi'

function renderRoute(route: string) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <App />
    </MemoryRouter>,
  )
}

describe('Relay Desk', () => {
  beforeEach(() => relayDeskApi.resetForTests())
  afterEach(() => vi.restoreAllMocks())

  it('показывает продуктовую сводку', async () => {
    renderRoute('/dashboard')

    expect(await screen.findByRole('heading', { name: /доброе утро/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /последние заявки/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /команда на линии/i })).toBeInTheDocument()
  })

  it('при переходе из сводки в раздел "Просрочено" переводит в раздел заявок с установленным фильтром', async () => {
    const user = userEvent.setup()
    renderRoute('/dashboard')

    await user.click(await screen.findByRole('link', { name: /просрочено/i }))
    expect(await screen.findByPlaceholderText(/номер, тема или автор/i)).toBeInTheDocument()
    expect(await screen.findByRole('combobox', { name: 'SLA' })).toHaveValue('overdue')
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

  it('поле поиска заявок синхронизируется с URL и не сбрасывается при изменении других фильтров', async () => {
    const user = userEvent.setup()
    renderRoute('/tickets')
    const globalSearch = await screen.findByPlaceholderText('Поиск заявок по номеру, теме или автору')
    const innerSearch = await screen.findByPlaceholderText('Номер, тема или автор')

    await user.type(globalSearch, 'test')
    await user.keyboard('{Enter}')
    expect(innerSearch).toHaveValue('test')

    await user.clear(innerSearch)
    await user.type(innerSearch, 'new test')
    await screen.findByRole('option', { name: 'Рабочее место' })
    await user.selectOptions(screen.getByRole('combobox', { name: 'Очередь' }), 'workplace')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Сортировка' }), 'created_desc')
    expect(innerSearch).toHaveValue('new test')
  })

  it('кнопка "Сбросить фильтры" устанавливает фокус при управлении с клавиатуры и сбрасывает фильтры при нажатии', async () => {
    const user = userEvent.setup()
    renderRoute('/tickets')

    const input = await screen.findByRole('searchbox', { name: /поиск заявок/i })
    await user.type(input, 'ggggg')
    await user.keyboard('{Enter}')
    const status = screen.getByRole('combobox', { name: 'Статус' })
    await user.selectOptions(status, 'in_progress')
    const queue = screen.getByRole('combobox', { name: 'Очередь' })
    await screen.findByRole('option', { name: 'Рабочее место' })
    await user.selectOptions(queue, 'workplace')
    const priority = screen.getByRole('combobox', { name: 'Приоритет' })
    await user.selectOptions(priority, 'medium')
    const sort = screen.getByRole('combobox', { name: 'Сортировка' })
    await user.selectOptions(sort, 'created_desc')
    const sla = screen.getByRole('combobox', { name: 'SLA' })
    await user.selectOptions(sla, 'overdue')

    expect(await screen.findByText(/Измените условия поиска или/)).toBeInTheDocument()
    const resetFiltersButton = screen.getByRole('button', { name: 'сбросьте фильтры' })
    expect(resetFiltersButton).toBeInTheDocument()

    screen.getByRole('button', { name: 'Найти' }).focus()
    await user.tab()
    expect(resetFiltersButton).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(screen.queryByText(/Измените условия поиска или/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'сбросьте фильтры' })).not.toBeInTheDocument()
    expect(input).toHaveValue('')
    expect(status).toHaveValue('all')
    expect(queue).toHaveValue('all')
    expect(priority).toHaveValue('all')
    expect(sort).toHaveValue('updated_desc')
    expect(sla).toHaveValue('all')
    expect(await screen.findByText('Всего: 10')).toBeInTheDocument()
  })

  it('формирует варианты очередей из данных API', async () => {
    const originalData = await relayDeskApi.getTickets()
    vi.spyOn(relayDeskApi, 'getTickets').mockResolvedValue({
      ...originalData,
      queues: [
        {
          id: 'test-id',
          name: 'test-name',
          color: '#000000',
        },
      ],
    })
    renderRoute('/tickets')

    const option = await screen.findByRole('option', { name: 'test-name' })
    expect(option).toBeInTheDocument()
    expect(option).toHaveValue('test-id')
    expect(screen.queryByRole('option', { name: 'Доступы' })).not.toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Рабочее место' })).not.toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Финансы' })).not.toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Сотрудники' })).not.toBeInTheDocument()
  })

  it('восстанавливает выбранную очередь из URL после загрузки данных', async () => {
    renderRoute('/tickets?queue=workplace')

    const option = screen.getByRole('combobox', { name: 'Очередь' })
    await waitFor(() => {
      expect(option).toHaveValue('workplace')
    })
  })

  it('не маскирует статические подписи под работающие контролы', async () => {
    renderRoute('/tickets')

    expect(await screen.findByRole('heading', { name: 'Все заявки' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Все заявки' })).not.toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Все заявки' })).not.toBeInTheDocument()
    expect(screen.queryByText('⌘ K')).not.toBeInTheDocument()
  })

  it('не отображает кнопки пагинации и показывает количество заявок', async () => {
    renderRoute('/tickets')

    await screen.findByText('Всего: 10')
    expect(screen.queryByRole('button', { name: 'Назад' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Вперёд' })).not.toBeInTheDocument()
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

    await user.type(await screen.findByLabelText('Тема'), 'Подключить общий календарь')
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

  it('переносит выбранную услугу из каталога в заполненную форму', async () => {
    const user = userEvent.setup()
    renderRoute('/catalog')

    await user.click(await screen.findByRole('link', { name: 'Оформить услугу «Доступ к приложению»' }))

    expect(await screen.findByRole('region', { name: 'Выбранная услуга' })).toHaveTextContent('Доступ к приложению')
    expect(screen.getByLabelText('Тема')).toHaveValue('Предоставить доступ к приложению')
    expect(screen.getByLabelText('Категория')).toHaveValue('software')
  })

  it('открывает полное содержание статьи базы знаний', async () => {
    const user = userEvent.setup()
    renderRoute('/knowledge')

    await user.click(await screen.findByRole('link', { name: 'Как восстановить доступ после смены пароля' }))

    expect(await screen.findByRole('heading', { name: 'Обновите сессию' })).toBeInTheDocument()
    expect(screen.getByText(/выйдите из корпоративного портала/i)).toBeInTheDocument()
  })

  it('сохраняет внутреннюю заметку отдельно от публичного ответа', async () => {
    const user = userEvent.setup()
    renderRoute('/tickets/RD-142')

    await user.click(await screen.findByRole('button', { name: 'Добавить внутреннюю заметку' }))
    await user.type(screen.getByLabelText('Внутренняя заметка'), 'Проверить журнал SSO до ответа клиенту.')
    await user.click(screen.getByRole('button', { name: 'Сохранить заметку' }))

    expect(
      await screen.findByText('Проверить журнал SSO до ответа клиенту.', { selector: '.message p' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Внутренняя заметка сохранена.')).toBeInTheDocument()
    expect(screen.getByText('Внутренняя заметка', { selector: '.internal-label' })).toBeInTheDocument()
  })

  it('показывает ошибку неуспешного сохранения свойств и оставляет форму открытой', async () => {
    const user = userEvent.setup()
    renderRoute('/tickets/RD-142')
    await user.click(await screen.findByRole('button', { name: 'Изменить' }))
    relayDeskApi.failNextForTests('update', 'Сервис временно недоступен')

    await user.click(screen.getByRole('button', { name: 'Сохранить' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Сервис временно недоступен')
    expect(screen.getByRole('button', { name: 'Сохранить' })).toBeInTheDocument()
  })

  it('переводит фокус в поле ответа с клавиатурно доступной кнопки', async () => {
    const user = userEvent.setup()
    renderRoute('/tickets/RD-142')
    const button = await screen.findByRole('button', { name: 'Ответить' })

    await user.click(button)

    expect(screen.getByLabelText('Ответ сотруднику')).toHaveFocus()
  })

  it('показывает отчёты и команду из локального API', async () => {
    const { unmount } = renderRoute('/reports')
    expect(await screen.findByRole('heading', { name: 'Отчёты' })).toBeInTheDocument()
    expect(screen.getByText('10', { selector: '.metric-card strong' })).toBeInTheDocument()
    unmount()
    renderRoute('/team')
    expect(await screen.findByRole('heading', { name: 'Команда поддержки' })).toBeInTheDocument()
    expect(screen.getAllByText(/Первая линия/).length).toBeGreaterThan(0)
  })

  it('показывает воспроизводимый error-state чтения очереди', async () => {
    relayDeskApi.failNextForTests('tickets', 'Очередь временно недоступна')
    renderRoute('/tickets')
    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось загрузить данные')
  })

  it('показывает ошибку создания и сохраняет введённые значения', async () => {
    const user = userEvent.setup()
    renderRoute('/tickets/new')
    const title = await screen.findByLabelText('Тема')
    await user.type(title, 'Подключить корпоративный календарь')
    await user.type(screen.getByLabelText('Описание'), 'Нужен доступ к календарю команды продаж.')
    await user.type(screen.getByLabelText('Автор'), 'Ирина Волкова')
    await user.type(screen.getByLabelText('Рабочая почта'), 'irina@northstar.ru')
    await user.type(screen.getByLabelText('Подразделение'), 'Продажи')
    relayDeskApi.failNextForTests('create', 'Создание временно недоступно')
    await user.click(screen.getByRole('button', { name: 'Создать заявку' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Создание временно недоступно')
    expect(title).toHaveValue('Подключить корпоративный календарь')
  })

  it('скрывает и блокирует управленческие разделы для первой линии', async () => {
    relayDeskApi.setCurrentUserForTests('agent-1')
    renderRoute('/reports')
    expect(await screen.findByRole('heading', { name: 'Раздел недоступен' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Отчёты' })).not.toBeInTheDocument()
  })
})
