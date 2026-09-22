import { useCallback, useEffect, useMemo, useState } from 'react'
import { Bug, Trash2, Upload } from 'lucide-react'
import {
  filterByMonth,
  formatMonthLabel,
  listMonthKeys,
  parseReportFile,
  type ReportRow,
} from '../lib/parseReport'
import {
  evaluateTaggedUsers,
  evaluateUserDetail,
  tagRowsWithCarriers,
} from '../lib/evaluate'
import { buildDebugReport } from '../lib/debugReport'
import {
  fetchClientsWithUsers,
  type ClientWithUsers,
} from '../lib/clientsStore'
import { WorkloadTable } from '../components/WorkloadTable'
import { WorkloadCharts } from '../components/WorkloadCharts'
import { UserDetailView } from '../components/UserDetailView'
import { DebugPanel } from '../components/DebugPanel'

export function ReportPage() {
  const [rows, setRows] = useState<ReportRow[]>([])
  const [monthKey, setMonthKey] = useState<string | null>(null)
  const [clients, setClients] = useState<ClientWithUsers[]>([])
  const [fileNames, setFileNames] = useState<string[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [debugOpen, setDebugOpen] = useState(false)

  const loadAssignments = useCallback(() => {
    setClients(fetchClientsWithUsers())
  }, [])

  useEffect(() => {
    loadAssignments()
  }, [loadAssignments])

  const months = useMemo(() => listMonthKeys(rows), [rows])

  // Tag carriers on full file order, then filter by month
  const tagged = useMemo(
    () => tagRowsWithCarriers(rows, clients),
    [rows, clients],
  )

  const filtered = useMemo(
    () => filterByMonth(tagged, monthKey),
    [tagged, monthKey],
  )

  const metrics = useMemo(() => evaluateTaggedUsers(filtered), [filtered])

  const detail = useMemo(() => {
    if (!selectedUser) return null
    return evaluateUserDetail(filtered, selectedUser)
  }, [filtered, selectedUser])

  const debug = useMemo(() => {
    if (!debugOpen) return null
    if (!filtered.length && !clients.length) return null
    return buildDebugReport(
      filtered,
      clients.map((c) => c.name),
    )
  }, [debugOpen, filtered, clients])

  async function onFiles(fileList: FileList | null) {
    if (!fileList?.length) return
    setError('')
    setBusy(true)
    setSelectedUser(null)

    try {
      const files = [...fileList]
      const added: ReportRow[] = []
      const names: string[] = []
      const failures: string[] = []

      for (const file of files) {
        try {
          const buffer = await file.arrayBuffer()
          const parsed = parseReportFile(buffer)
          if (!parsed.length) {
            failures.push(file.name)
            continue
          }
          added.push(...parsed)
          names.push(file.name)
        } catch {
          failures.push(file.name)
        }
      }

      if (!added.length) {
        setError('No rows found in selected file(s).')
        return
      }

      setRows((prev) => {
        const next = [...prev, ...added]
        const keys = listMonthKeys(next)
        setMonthKey((current) =>
          current && keys.includes(current) ? current : (keys[0] ?? null),
        )
        return next
      })
      setFileNames((prev) => {
        const merged = [...prev]
        for (const name of names) {
          if (!merged.includes(name)) merged.push(name)
        }
        return merged
      })
      loadAssignments()

      if (failures.length) {
        setError(`Skipped: ${failures.join(', ')}`)
      }
    } catch (e) {
      console.error(e)
      setError('Could not read file(s).')
    } finally {
      setBusy(false)
    }
  }

  function onClear() {
    setRows([])
    setFileNames([])
    setMonthKey(null)
    setSelectedUser(null)
    setError('')
  }

  if (detail) {
    return (
      <UserDetailView
        detail={detail}
        onBack={() => setSelectedUser(null)}
        hasClientList={clients.length > 0}
      />
    )
  }

  return (
    <div className="page">
      <header className="page-header">
        <label className="upload-btn">
          <Upload size={16} />
          <span>{busy ? '…' : 'Report'}</span>
          <input
            type="file"
            accept=".xls,.xlsx"
            multiple
            hidden
            disabled={busy}
            onChange={(e) => {
              void onFiles(e.target.files)
              e.target.value = ''
            }}
          />
        </label>
        {fileNames.length > 0 ? (
          <button
            type="button"
            className="icon-btn"
            title="Clear reports"
            disabled={busy}
            onClick={onClear}
          >
            <Trash2 size={16} />
          </button>
        ) : null}
        {fileNames.length > 0 ? (
          <span className="file-name" title={fileNames.join('\n')}>
            {fileNames.length === 1
              ? fileNames[0]
              : `${fileNames.length} files`}
          </span>
        ) : null}
        {months.length > 0 ? (
          <select
            className="month-select"
            value={monthKey ?? ''}
            onChange={(e) => setMonthKey(e.target.value || null)}
            aria-label="Month"
          >
            {months.map((m) => (
              <option key={m} value={m}>
                {formatMonthLabel(m)}
              </option>
            ))}
          </select>
        ) : null}
        <button
          type="button"
          className={`icon-btn ${debugOpen ? 'active-debug' : ''}`}
          title="Debug"
          onClick={() => setDebugOpen((v) => !v)}
        >
          <Bug size={16} />
        </button>
      </header>

      {error ? <p className="error">{error}</p> : null}

      <DebugPanel debug={debug} open={debugOpen} />

      {!rows.length && !error ? (
        <p className="muted">Upload one or more verification .xls reports.</p>
      ) : null}

      {rows.length > 0 ? (
        <>
          <section className="section">
            <h2>Workload</h2>
            <WorkloadTable rows={metrics} onSelectUser={setSelectedUser} />
          </section>

          <section className="section">
            <WorkloadCharts rows={metrics} />
          </section>
        </>
      ) : null}
    </div>
  )
}
