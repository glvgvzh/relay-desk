import type { ReactNode } from 'react'
import { relayDeskApi } from '../api/relayDeskApi'
import { LoadingState } from '../components/PageState'
import { useAsyncData } from '../hooks/useAsyncData'

export function ManagementRoute({ children }: { children: ReactNode }) {
  const shell = useAsyncData((signal) => relayDeskApi.getShell(signal), 'management-access')
  if (shell.status === 'loading') return <LoadingState label="Проверяем доступ" />
  if (shell.status === 'error' || !shell.data.canViewManagement) {
    return (
      <section className="empty-state">
        <h1>Раздел недоступен</h1>
        <p>Отчёты и управление командой доступны руководителю поддержки и администратору.</p>
      </section>
    )
  }
  return children
}
