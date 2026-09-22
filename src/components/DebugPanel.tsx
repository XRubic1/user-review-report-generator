import type { DebugReport } from '../lib/debugReport'

type Props = {
  debug: DebugReport | null
  open: boolean
}

export function DebugPanel({ debug, open }: Props) {
  if (!open || !debug) return null

  return (
    <div className="debug-panel">
      <p className="muted">
        Rows {debug.reportRowCount} · empty client {debug.emptyClientRows} · clients list{' '}
        {debug.clientListCount} · sections {debug.sections.length} · matched{' '}
        {debug.matchedSections} · unmatched {debug.unmatchedSections}
      </p>
      <p className="muted">
        Users: {debug.users.join(', ') || '—'} · Months: {debug.months.join(', ') || '—'}
      </p>
      <p className="muted">
        Styles: {JSON.stringify(debug.styleTotals)} · Types:{' '}
        {JSON.stringify(debug.typeTotals)}
      </p>

      <h3>Clients list (sample)</h3>
      {!debug.clientListSample.length ? (
        <p className="error">No Clients list loaded — upload on Clients tab.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>List name</th>
                <th>Normalized</th>
              </tr>
            </thead>
            <tbody>
              {debug.clientListSample.map((c) => (
                <tr key={c.raw}>
                  <td>{c.raw}</td>
                  <td className="notes-cell">{c.normalized}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h3>Column A sections → match</h3>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Report A name</th>
              <th>Normalized</th>
              <th>Match</th>
              <th>As</th>
              <th>Batches</th>
              <th>Inv</th>
              <th>Users</th>
            </tr>
          </thead>
          <tbody>
            {debug.sections.slice(0, 80).map((s) => (
              <tr
                key={s.reportName}
                className={s.matched ? 'debug-ok' : 'debug-miss'}
              >
                <td className="notes-cell">{s.reportName}</td>
                <td className="notes-cell">{s.normalized}</td>
                <td>{s.matched ? 'YES' : 'no'}</td>
                <td className="notes-cell">{s.matchedAs || '—'}</td>
                <td>{s.batches}</td>
                <td>{s.invoices}</td>
                <td>{s.users.join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {debug.nearMisses.length > 0 ? (
        <>
          <h3>Near misses</h3>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Report</th>
                  <th>Best list</th>
                  <th>Report norm</th>
                  <th>List norm</th>
                </tr>
              </thead>
              <tbody>
                {debug.nearMisses.map((n) => (
                  <tr key={n.reportName + n.bestListName}>
                    <td className="notes-cell">{n.reportName}</td>
                    <td className="notes-cell">{n.bestListName}</td>
                    <td className="notes-cell">{n.reportNorm}</td>
                    <td className="notes-cell">{n.listNorm}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {debug.unusedClientListNames.length > 0 ? (
        <>
          <h3>Unused clients list (sample)</h3>
          <p className="notes-cell muted">
            {debug.unusedClientListNames.join(' · ')}
          </p>
        </>
      ) : null}

      <h3>Sample rows</h3>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Client</th>
              <th>User</th>
              <th>Type</th>
              <th>Style</th>
              <th>Inv</th>
              <th>Ids</th>
              <th>Notes</th>
              <th>Month</th>
            </tr>
          </thead>
          <tbody>
            {debug.sampleRows.map((r, i) => (
              <tr key={`${r.client}-${i}`}>
                <td className="notes-cell">{r.client}</td>
                <td>{r.user}</td>
                <td>{r.type}</td>
                <td>{r.style}</td>
                <td>{r.invoices}</td>
                <td className="notes-cell">{r.invoiceIds}</td>
                <td className="notes-cell">{r.notes}</td>
                <td>{r.month || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
