import { useMemo, useState } from 'react'
import type { UserMetrics } from '../lib/evaluate'

type Props = {
  rows: UserMetrics[]
  onSelectUser: (user: string) => void
}

type SortKey =
  | 'user'
  | 'invoices'
  | 'verifiedInvoices'
  | 'notVerifiedInvoices'
  | 'webInvoices'
  | 'phoneInvoices'
  | 'emailInvoices'
  | 'verCount'
  | 'pverCount'
  | 'outsideInvoices'

type SortDir = 'asc' | 'desc'

const COLUMNS: { key: SortKey; label: string; title?: string }[] = [
  { key: 'user', label: 'User' },
  { key: 'invoices', label: 'Invoices' },
  { key: 'verifiedInvoices', label: 'Verified' },
  { key: 'notVerifiedInvoices', label: 'Not ver.' },
  { key: 'webInvoices', label: 'WEB' },
  { key: 'phoneInvoices', label: 'Phone' },
  { key: 'emailInvoices', label: 'Email' },
  { key: 'verCount', label: 'VER' },
  { key: 'pverCount', label: 'P-VER' },
  {
    key: 'outsideInvoices',
    label: 'Outside inv.',
    title: 'Invoices not under a carrier assigned to this user',
  },
]

function compare(a: UserMetrics, b: UserMetrics, key: SortKey, dir: SortDir): number {
  const mul = dir === 'asc' ? 1 : -1
  if (key === 'user') {
    return mul * a.user.localeCompare(b.user)
  }
  return mul * ((a[key] as number) - (b[key] as number))
}

export function WorkloadTable({ rows, onSelectUser }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('verifiedInvoices')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [filter, setFilter] = useState('')

  const sorted = useMemo(() => {
    const q = filter.trim().toLowerCase()
    const list = q
      ? rows.filter((r) => r.user.toLowerCase().includes(q))
      : [...rows]
    list.sort((a, b) => compare(a, b, sortKey, sortDir))
    return list
  }, [rows, sortKey, sortDir, filter])

  function onHeaderClick(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'user' ? 'asc' : 'desc')
    }
  }

  if (!rows.length) {
    return <p className="muted">No data for this month.</p>
  }

  return (
    <div className="workload-block">
      <div className="workload-toolbar">
        <input
          type="search"
          className="workload-filter-input"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter user…"
          aria-label="Filter users"
        />
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {COLUMNS.map((c) => (
                <th key={c.key} title={c.title}>
                  <button
                    type="button"
                    className={`th-sort ${sortKey === c.key ? 'active' : ''}`}
                    onClick={() => onHeaderClick(c.key)}
                  >
                    {c.label}
                    {sortKey === c.key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr
                key={r.user}
                className="clickable-row"
                onClick={() => onSelectUser(r.user)}
              >
                <td>
                  <button type="button" className="linkish">
                    {r.user}
                  </button>
                </td>
                <td>{r.invoices}</td>
                <td>{r.verifiedInvoices}</td>
                <td>{r.notVerifiedInvoices}</td>
                <td>{r.webInvoices}</td>
                <td>{r.phoneInvoices}</td>
                <td>{r.emailInvoices}</td>
                <td>{r.verCount}</td>
                <td>{r.pverCount}</td>
                <td>{r.outsideInvoices}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
