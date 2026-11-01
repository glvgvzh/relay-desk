import { useEffect, useState, type FormEvent } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { relayDeskApi } from '../api/relayDeskApi'
import { useAsyncData } from '../hooks/useAsyncData'

const navigation = [
  { label: 'Обзор', to: '/dashboard', icon: '⌂' },
  { label: 'Заявки', to: '/tickets', icon: '◫' },
  { label: 'Каталог услуг', to: '/catalog', icon: '⊞' },
  { label: 'База знаний', to: '/knowledge', icon: '▤' },
]

const management = [
  { label: 'Команда', to: '/team', icon: '◎' },
  { label: 'Отчёты', to: '/reports', icon: '⌁' },
]

type NavigationItem = { label: string; to: string; icon: string; count?: number }

function NavigationGroup({ label, items }: { label: string; items: NavigationItem[] }) {
  return (
    <div className="nav-group">
      <p className="nav-group-label">{label}</p>
      <ul className="nav-list">
        {items.map((item) => (
          <li key={item.to}>
            <NavLink className={({ isActive }) => (isActive ? 'nav-link nav-link-active' : 'nav-link')} to={item.to}>
              <span className="nav-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span>{item.label}</span>
              {item.count !== undefined && <span className="nav-count">{item.count}</span>}
            </NavLink>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function AppShell() {
  const navigate = useNavigate()
  const [revision, setRevision] = useState(0)
  const shell = useAsyncData((signal) => relayDeskApi.getShell(signal), `shell:${revision}`)

  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1)
    window.addEventListener('relaydesk:datachange', refresh)
    return () => window.removeEventListener('relaydesk:datachange', refresh)
  }, [])

  const shellData = shell.status === 'success' ? shell.data : null
  const workspaceItems: NavigationItem[] = navigation.map((item) =>
    item.to === '/tickets' ? { ...item, count: shellData?.activeTickets } : item,
  )

  function submitGlobalSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const query = String(formData.get('query') ?? '').trim()
    navigate(query ? `/tickets?q=${encodeURIComponent(query)}` : '/tickets')
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <NavLink className="brand" to="/dashboard" aria-label="Главная Relay Desk">
          <span className="brand-mark" aria-hidden="true">
            R
          </span>
          <span>Relay Desk</span>
        </NavLink>

        <nav aria-label="Основная навигация">
          <NavigationGroup label="Рабочее пространство" items={workspaceItems} />
          {shellData?.canViewManagement && <NavigationGroup label="Управление" items={management} />}
        </nav>

        <div className="sidebar-footer">
          <div className="profile">
            <span className="avatar">{shellData?.currentUser.avatar ?? '…'}</span>
            <span>
              <strong>{shellData?.currentUser.name ?? 'Загрузка'}</strong>
              <small>{shellData?.currentUser.role ?? 'Профиль'}</small>
            </span>
            <span className="presence" aria-label="На линии" />
          </div>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <form className="global-search" role="search" onSubmit={submitGlobalSearch}>
            <span className="search-icon" aria-hidden="true">
              ⌕
            </span>
            <label className="sr-only" htmlFor="global-search">
              Поиск по продукту
            </label>
            <input
              id="global-search"
              name="query"
              type="search"
              placeholder="Поиск заявок по номеру, теме или автору"
            />
            <kbd>⌘ K</kbd>
          </form>
          <div className="topbar-actions">
            <Link className="secondary-button" to="/tickets/new">
              Создать заявку
            </Link>
          </div>
        </header>

        <main className="main-content" id="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
