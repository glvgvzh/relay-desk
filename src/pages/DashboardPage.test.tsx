import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DashboardPage } from './DashboardPage'
import { relayDeskApi } from '../api/relayDeskApi'

vi.mock('../api/relayDeskApi', () => ({
  relayDeskApi: {
    getDashboard: vi.fn(),
  },
}))

describe('DashboardPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('повторно загружает данные после нажатия кнопки "Повторить"', async () => {
    const user = userEvent.setup()
    const mockedGetDashboard = vi.mocked(relayDeskApi.getDashboard).mockRejectedValue(new Error('Ошибка'))
    render(<DashboardPage />)
    expect(await screen.findByText('Что-то пошло не так')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Повторить' }))
    await waitFor(() => {
      expect(mockedGetDashboard).toHaveBeenCalledTimes(2)
    })
    expect(screen.getByRole('button', { name: 'Повторить' })).toBeInTheDocument()
  })
})
