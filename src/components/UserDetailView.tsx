import { useState } from 'react'
import { type EntityBreakdown, type UserDetail } from '../lib/evaluate'
import { ArrowLeft } from 'lucide-react'

type Props = {
  detail: UserDetail
  onBack: () => void
  hasClientList: boolean
}

type Tab = 'carriers' | 'brokers' | 'otherCarriers'

function EntityList({
  rows,
  empty,
  nameHeader,
}: {
  rows: EntityBreakdown[]
  empty: string
  nameHeader: string
}) {
  if (!rows.length) return <p className="muted">{empty}</p>

  return (
    <div className="table-wrap">
      <table className="data-table entity-list-table">
        <thead>
          <tr>
            <th>{nameHeader}</th>
            <th>#</th>
            <th>Verified</th>
            <th>Not ver.</th>
            <th>WEB</th>
            <th>Phone</th>
            <th>Email</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.name}>
              <td>{c.name}</td>
              <td>{c.invoices}</td>
              <td>{c.verifiedInvoices}</td>
              <td>{c.notVerifiedInvoices}</td>
              <td>{c.webInvoices}</td>
              <td>{c.phoneInvoices}</td>
              <td>{c.emailInvoices}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function UserDetailView({ detail, onBack, hasClientList }: Props) {
  const { metrics, carriers, brokers, otherCarriers, topCarrier, user } = detail
  const [tab, setTab] = useState<Tab>(carriers.length ? 'carriers' : 'brokers')

  return (
    <div className="page">
      <header className="page-header">
        <button type="button" className="icon-btn" onClick={onBack} title="Back">
          <ArrowLeft size={16} />
        </button>
        <h1 className="user-title">{user}</h1>
      </header>

      <section className="section">
        <div className="stat-row">
          <div className="stat">
            <span className="stat-label">Invoices</span>
            <span className="stat-value">{metrics.invoices}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Verified</span>
            <span className="stat-value">{metrics.verifiedInvoices}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Not ver.</span>
            <span className="stat-value">{metrics.notVerifiedInvoices}</span>
          </div>
          <div className="stat">
            <span className="stat-label">WEB</span>
            <span className="stat-value">{metrics.webInvoices}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Phone</span>
            <span className="stat-value">{metrics.phoneInvoices}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Email</span>
            <span className="stat-value">{metrics.emailInvoices}</span>
          </div>
          <div
            className="stat"
            title="Invoices not under a carrier assigned to this user (C+)"
          >
            <span className="stat-label">Outside inv.</span>
            <span className="stat-value">{metrics.outsideInvoices}</span>
          </div>
        </div>
      </section>

      {topCarrier ? (
        <section className="section">
          <h2>Top carrier</h2>
          <p className="top-carrier-line">
            <strong>{topCarrier.name}</strong>
            <span>{topCarrier.invoices}#</span>
            <span>verified {topCarrier.verifiedInvoices}</span>
            <span>not ver {topCarrier.notVerifiedInvoices}</span>
            <span>web {topCarrier.webInvoices}</span>
            <span>phone {topCarrier.phoneInvoices}</span>
            <span>email {topCarrier.emailInvoices}</span>
          </p>
        </section>
      ) : null}

      <div className="tabs">
        <button
          type="button"
          className={`tab ${tab === 'carriers' ? 'active' : ''}`}
          onClick={() => setTab('carriers')}
        >
          Carriers ({carriers.length})
        </button>
        <button
          type="button"
          className={`tab ${tab === 'brokers' ? 'active' : ''}`}
          onClick={() => setTab('brokers')}
        >
          Brokers ({brokers.length})
        </button>
        <button
          type="button"
          className={`tab ${tab === 'otherCarriers' ? 'active' : ''}`}
          onClick={() => setTab('otherCarriers')}
          title="On Clients list but this user is not on columns C+"
        >
          Other list ({otherCarriers.length})
        </button>
      </div>

      <section className="section">
        {tab === 'carriers' ? (
          <EntityList
            rows={carriers}
            nameHeader="Carrier"
            empty={
              hasClientList
                ? 'No Clients-list carriers found for this user.'
                : 'Upload a Clients list to see carriers.'
            }
          />
        ) : null}
        {tab === 'brokers' ? (
          <EntityList
            rows={brokers}
            nameHeader="Broker"
            empty="No brokers under this user’s carriers."
          />
        ) : null}
        {tab === 'otherCarriers' ? (
          <EntityList
            rows={otherCarriers}
            nameHeader="Carrier"
            empty="No other Clients-list carriers in this user’s work."
          />
        ) : null}
      </section>
    </div>
  )
}
