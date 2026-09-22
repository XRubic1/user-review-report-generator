import { useCallback, useEffect, useState } from 'react'
import { RefreshCw, Trash2, Upload } from 'lucide-react'
import { parseClientMatrixFile } from '../lib/parseClients'
import {
  clearClients,
  fetchClientsWithUsers,
  replaceClientMatrix,
  type ClientWithUsers,
} from '../lib/clientsStore'

export function ClientsPage() {
  const [clients, setClients] = useState<ClientWithUsers[]>([])
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    setClients(fetchClientsWithUsers())
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function onFile(file: File | undefined) {
    if (!file) return

    setBusy(true)
    setError('')
    setStatus('')
    try {
      const buffer = await file.arrayBuffer()
      const parsed = parseClientMatrixFile(buffer)
      if (!parsed.length) {
        setError('No client rows found.')
        return
      }
      replaceClientMatrix(parsed)
      setStatus(`Saved ${parsed.length} clients.`)
      load()
    } catch (e) {
      console.error(e)
      setError('Upload failed.')
    } finally {
      setBusy(false)
    }
  }

  function onClear() {
    clearClients()
    setStatus('Cleared.')
    load()
  }

  return (
    <div className="page">
      <header className="page-header">
        <label className="upload-btn">
          <Upload size={16} />
          <span>{busy ? '…' : 'Upload'}</span>
          <input
            type="file"
            accept=".xls,.xlsx"
            hidden
            disabled={busy}
            onChange={(e) => {
              void onFile(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </label>
        <button
          type="button"
          className="icon-btn"
          title="Refresh"
          disabled={busy}
          onClick={load}
        >
          <RefreshCw size={16} />
        </button>
        <button
          type="button"
          className="icon-btn"
          title="Clear"
          disabled={busy || !clients.length}
          onClick={onClear}
        >
          <Trash2 size={16} />
        </button>
      </header>

      {error ? <p className="error">{error}</p> : null}
      {status ? <p className="ok">{status}</p> : null}

      <section className="section">
        <h2>Clients</h2>
        {!clients.length ? (
          <p className="muted">
            Upload Document.xlsx style list: A=client, B=A/E, C+=team users. A carrier counts for a
            report user only if their name is in that row’s C+ cells; otherwise outside the team.
          </p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>A/E</th>
                  <th>Team (C+)</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td>{c.accountExec || '—'}</td>
                    <td>{c.users.join(', ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
