import { relayDeskApi } from '../api/relayDeskApi'
import { ErrorState, LoadingState } from '../components/PageState'
import { PageHeader } from '../components/PageHeader'
import { useAsyncData } from '../hooks/useAsyncData'

export function CatalogPage() {
  const [query, setQuery] = useState('')
  const result = useAsyncData((signal) => relayDeskApi.getCatalog(signal), 'catalog')
  if (result.status === 'loading') return <LoadingState label="Загружаем каталог" />
  if (result.status === 'error') return <ErrorState />

  const normalizedQuery = query.trim().toLocaleLowerCase('ru')
  const services = result.data.filter((service) => !normalizedQuery || `${service.title} ${service.description} ${service.category}`.toLocaleLowerCase('ru').includes(normalizedQuery))

  return (
    <>
      <PageHeader eyebrow="Самообслуживание" title="Каталог услуг" description="Выберите услугу, чтобы оформить запрос с нужными данными и сроками." />
      <label className="catalog-search"><span aria-hidden="true">⌕</span><span className="sr-only">Поиск по каталогу</span><input value={query} onChange={(event) => setQuery(event.target.value)} type="search" placeholder="Что вам нужно? Например, доступ или оборудование" /></label>

      {services.length === 0 && <p className="panel inline-empty" role="status">Услуги не найдены. Попробуйте изменить запрос.</p>}

      <section aria-labelledby="popular-heading">
        <div className="section-heading"><div><h2 id="popular-heading">Популярные услуги</h2><p>Чаще всего заказывают сотрудники</p></div></div>
        <div className="catalog-grid">
          {services.filter((service) => service.popular).map((service) => <ServiceCard key={service.id} service={service} />)}
        </div>
      </section>

      <section aria-labelledby="all-services-heading">
        <div className="section-heading"><div><h2 id="all-services-heading">Все услуги</h2><p>По категориям поддержки</p></div></div>
        <div className="catalog-grid catalog-grid-compact">
          {services.filter((service) => !service.popular).map((service) => <ServiceCard key={service.id} service={service} />)}
        </div>
      </section>
    </>
  )
}

function ServiceCard({ service }: { service: Awaited<ReturnType<typeof relayDeskApi.getCatalog>>[number] }) {
  return (
    <article className="service-card">
      <div className="service-icon" aria-hidden="true">{service.icon}</div>
      <p className="service-category">{service.category}</p>
      <h3>{service.title}</h3>
      <p>{service.description}</p>
      <footer><span>Срок: {service.deliveryTime}</span><Link to={`/tickets/new?service=${encodeURIComponent(service.id)}`} aria-label={`Оформить услугу «${service.title}»`}>→</Link></footer>
    </article>
  )
}

import { useState } from 'react'
import { Link } from 'react-router-dom'
