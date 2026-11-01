import { Navigate, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { AppShell } from './components/AppShell'
import { DashboardPage } from './pages/DashboardPage'
import { CatalogPage } from './pages/CatalogPage'
import { KnowledgeBasePage } from './pages/KnowledgeBasePage'
import { KnowledgeArticlePage } from './pages/KnowledgeArticlePage'
import { NotFoundPage } from './pages/NotFoundPage'
import { ReportsPage } from './pages/ReportsPage'
import { TeamPage } from './pages/TeamPage'
import { TicketDetailsPage } from './pages/TicketDetailsPage'
import { TicketsPage } from './pages/TicketsPage'
import { CreateTicketPage } from './pages/CreateTicketPage'
import { relayDeskApi } from './api/relayDeskApi'
import { LoadingState } from './components/PageState'
import { useAsyncData } from './hooks/useAsyncData'

function ManagementRoute({ children }: { children: ReactNode }) {
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

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate replace to="/dashboard" />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="tickets" element={<TicketsPage />} />
        <Route path="tickets/new" element={<CreateTicketPage />} />
        <Route path="tickets/:ticketId" element={<TicketDetailsPage />} />
        <Route path="catalog" element={<CatalogPage />} />
        <Route path="knowledge" element={<KnowledgeBasePage />} />
        <Route path="knowledge/:articleId" element={<KnowledgeArticlePage />} />
        <Route
          path="team"
          element={
            <ManagementRoute>
              <TeamPage />
            </ManagementRoute>
          }
        />
        <Route
          path="reports"
          element={
            <ManagementRoute>
              <ReportsPage />
            </ManagementRoute>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
