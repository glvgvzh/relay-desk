import { createRoutesFromElements, Route, Navigate } from 'react-router-dom'
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
import { ManagementRoute } from './components/ManagementRoute'

export const routes = createRoutesFromElements(
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
  </Route>,
)
