import * as XLSX from 'xlsx'

export type VerificationType = 'VER' | 'P-VER' | 'OTHER'

export type VerificationStyle = 'WEB' | 'Phone' | 'Email' | 'Other'

export type VerificationOutcome = 'verified' | 'not_verified' | 'unknown'

export type ReportRow = {
  /** Funding company from sheet header (informational) */
  reportClient: string
  /**
   * Column A section header for this block (carrier OR broker name).
   * Carriers match the Clients list; brokers do not.
   */
  section: string
  /**
   * Column A headers since the previous data row, in sheet order
   * (includes `section`). Needed so header-only carriers like
   * "015 LOGISTICS INC" (no VER under them) still start a carrier span.
   */
  sectionPath: string[]
  user: string
  verificationType: VerificationType
  /** Normalized method: WEB / Phone / Email */
  style: VerificationStyle
  /** OK to buy = verified, Denied = not verified */
  outcome: VerificationOutcome
  date: Date | null
  monthKey: string | null
  invoiceCount: number
  invoiceIds: string[]
  rawInvoices: string
  notes: string
}

type ColumnMap = {
  client: number
  type: number
  user: number
  contact: number
  method: number
  date: number
  dateTime: number
  notes: number
  invoices: number
}

const DEFAULT_COLS: ColumnMap = {
  client: 0, // A — Client / Debtor section headers
  type: 3,
  user: 4,
  contact: 5,
  method: 6,
  date: 8, // I — When
  dateTime: 2, // C — Date/Time
  notes: 9,
  invoices: 11,
}

export function parseInvoiceIds(value: unknown): string[] {
  if (value == null || value === '') return []
  const raw = String(value)
  const ids = raw
    .split(/[,;]+/)
    .map((p) => p.trim())
    .filter(Boolean)

  // .xls cells cap at 255 chars — last id is often cut off ("141")
  if (raw.length >= 255 && ids.length > 0) {
    const last = ids[ids.length - 1]!
    const prev = ids[ids.length - 2]
    if (!prev || last.length < prev.length) ids.pop()
  }

  return ids
}

export function countInvoices(value: unknown): number {
  return parseInvoiceIds(value).length
}

/** Comma-separated invoice blob (often orphaned into Type col on the next row). */
function looksLikeInvoiceList(value: unknown): boolean {
  const s = String(value ?? '').trim()
  if (!s || s.length < 3) return false
  if (!s.includes(',')) return false
  // starts with an id-like token: 14044 / 14173R / IN-001
  return /^[A-Za-z0-9][\w./-]{0,24}\s*,/.test(s)
}

function findInvoiceCell(
  row: unknown[],
  cols: ColumnMap,
  preferIndex: number,
): string {
  const preferred = cellText(row, preferIndex)
  if (preferred) return preferred

  // Same row, other columns (misaligned export)
  for (let i = 0; i < row.length; i++) {
    if (i === cols.user || i === cols.client) continue
    if (looksLikeInvoiceList(cell(row, i))) return cellText(row, i)
  }
  return ''
}

/**
 * Some .xls exports put a long invoice list on the row *after* VER,
 * in the Type column, with Invoices left blank.
 */
function findOrphanInvoiceList(
  rows: unknown[][],
  startIndex: number,
  cols: ColumnMap,
): string {
  for (let j = startIndex; j < Math.min(rows.length, startIndex + 4); j++) {
    const row = rows[j]
    if (!row || !Array.isArray(row)) continue
    if (isClientHeaderRow(row, cols)) return ''

    const user = cellText(row, cols.user)
    const type = cellText(row, cols.type)
    if (user && parseVerificationType(type) !== 'OTHER') return ''

    if (looksLikeInvoiceList(type)) return type
    for (let i = 0; i < row.length; i++) {
      if (looksLikeInvoiceList(cell(row, i))) return cellText(row, i)
    }
  }
  return ''
}

function parseVerificationType(value: unknown): VerificationType {
  const raw = String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
  if (raw === 'VER') return 'VER'
  if (raw === 'P-VER' || raw === 'PVER') return 'P-VER'
  return 'OTHER'
}

export function parseVerificationStyle(
  method: unknown,
  contact: unknown = '',
): VerificationStyle {
  const m = String(method ?? '').trim().toLowerCase()
  const c = String(contact ?? '').trim().toLowerCase()

  if (m === 'phone' || m.includes('phone')) return 'Phone'
  if (m === 'email' || m.includes('email')) return 'Email'
  if (m.includes('web') || m.includes('portal')) return 'WEB'

  // Method empty — infer from contact
  if (c === 'web' || c.startsWith('web ') || c.startsWith('web-') || c.includes('web portal')) {
    return 'WEB'
  }
  if (c.includes('phone') || c.includes('tel')) return 'Phone'
  if (c.includes('@') || c.includes('email')) return 'Email'

  return 'Other'
}

export function parseVerificationOutcome(notes: unknown): VerificationOutcome {
  const n = String(notes ?? '').trim().toLowerCase()
  if (!n) return 'unknown'
  if (n.startsWith('ok to buy') || n.includes('ok to buy')) return 'verified'
  if (n.startsWith('denied') || n.includes('denied')) return 'not_verified'
  return 'unknown'
}

function excelDateToJs(value: unknown): Date | null {
  if (value == null || value === '') return null
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return isSaneDate(value) ? value : null
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    // Corrupt serials seen in P-VER "When" cells (e.g. 4292552276)
    if (value < 20000 || value > 60000) return null
    const parsed = XLSX.SSF.parse_date_code(value)
    if (!parsed) return null
    const d = new Date(
      parsed.y,
      parsed.m - 1,
      parsed.d,
      parsed.H || 0,
      parsed.M || 0,
      parsed.S || 0,
    )
    return isSaneDate(d) ? d : null
  }

  const text = String(value).trim()
  if (!text) return null

  const eu = text.match(
    /^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/,
  )
  if (eu) {
    const day = Number(eu[1])
    const month = Number(eu[2])
    let year = Number(eu[3])
    if (year < 100) year += 2000
    const hours = eu[4] ? Number(eu[4]) : 0
    const mins = eu[5] ? Number(eu[5]) : 0
    const secs = eu[6] ? Number(eu[6]) : 0
    const d = new Date(year, month - 1, day, hours, mins, secs)
    return isSaneDate(d) ? d : null
  }

  // Bare number string that is a bad serial
  if (/^\d+(\.\d+)?$/.test(text)) {
    const n = Number(text)
    if (n > 60000) return null
  }

  const d = new Date(text)
  return isSaneDate(d) ? d : null
}

function isSaneDate(d: Date): boolean {
  if (Number.isNaN(d.getTime())) return false
  const y = d.getFullYear()
  return y >= 1990 && y <= 2100
}

export function monthKeyFromDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export function formatMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number)
  const date = new Date(y, m - 1, 1)
  return date.toLocaleString(undefined, { month: 'long', year: 'numeric' })
}

function cell(row: unknown[], index: number): unknown {
  return row[index]
}

function cellText(row: unknown[], index: number): string {
  return String(cell(row, index) ?? '').trim()
}

function findHeaderRow(rows: unknown[][]): { headerIndex: number; cols: ColumnMap } {
  for (let i = 0; i < Math.min(rows.length, 40); i++) {
    const row = rows[i]
    if (!Array.isArray(row)) continue
    const labels = row.map((v) => String(v ?? '').trim().toLowerCase())
    const typeIdx = labels.findIndex((v) => v === 'type')
    const userIdx = labels.findIndex((v) => v.startsWith('user'))
    const contactIdx = labels.findIndex((v) => v.startsWith('contact'))
    const methodIdx = labels.findIndex((v) => v.startsWith('method'))
    const whenExact = labels.findIndex((v) => v === 'when')
    const dateIdx = labels.findIndex((v) => v.startsWith('date'))
    const invIdx = labels.findIndex((v) => v.startsWith('invoice'))
    const notesIdx = labels.findIndex(
      (v) => v.includes('notes') || v.includes('response'),
    )

    if (typeIdx >= 0 && userIdx >= 0) {
      return {
        headerIndex: i,
        cols: {
          client: 0,
          type: typeIdx,
          user: userIdx,
          contact: contactIdx >= 0 ? contactIdx : DEFAULT_COLS.contact,
          method: methodIdx >= 0 ? methodIdx : DEFAULT_COLS.method,
          date: whenExact >= 0 ? whenExact : DEFAULT_COLS.date,
          dateTime: dateIdx >= 0 ? dateIdx : DEFAULT_COLS.dateTime,
          notes: notesIdx >= 0 ? notesIdx : DEFAULT_COLS.notes,
          invoices: invIdx >= 0 ? invIdx : DEFAULT_COLS.invoices,
        },
      }
    }
  }

  return { headerIndex: 0, cols: DEFAULT_COLS }
}

/** Company name in the top-left of the sheet (team client for matching). */
function findReportClient(rows: unknown[][], headerIndex: number): string {
  for (let i = 0; i < headerIndex; i++) {
    const row = rows[i]
    if (!Array.isArray(row)) continue
    for (const value of row) {
      const text = String(value ?? '').trim()
      if (!text) continue
      const lower = text.toLowerCase()
      if (lower.startsWith('client') || lower.startsWith('debtor')) continue
      if (lower.includes('thru') || lower.includes('verification only')) continue
      return text
    }
  }
  return ''
}

function isClientHeaderRow(row: unknown[], cols: ColumnMap): boolean {
  const client = cellText(row, cols.client)
  const type = cellText(row, cols.type)
  const user = cellText(row, cols.user)
  if (!client) return false
  if (parseVerificationType(type) !== 'OTHER') return false
  return !user && !type
}

export function parseReportFile(file: ArrayBuffer): ReportRow[] {
  const workbook = XLSX.read(file, { type: 'array', cellDates: true })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) return []

  const sheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    raw: true,
  })

  if (rows.length < 2) return []

  const { headerIndex, cols } = findHeaderRow(rows)
  const reportClient = findReportClient(rows, headerIndex)
  const result: ReportRow[] = []
  let currentClient = ''
  /** Headers seen since last data row (sheet order). */
  let pendingHeaders: string[] = []

  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row || !Array.isArray(row)) continue

    if (isClientHeaderRow(row, cols)) {
      currentClient = cellText(row, cols.client)
      if (currentClient) pendingHeaders.push(currentClient)
      continue
    }

    const user = cellText(row, cols.user)
    const verificationType = parseVerificationType(cellText(row, cols.type))
    if (!user || verificationType === 'OTHER') continue

    const rowSection = cellText(row, cols.client)
    const section = rowSection || currentClient
    const sectionPath =
      pendingHeaders.length > 0
        ? [...pendingHeaders]
        : section
          ? [section]
          : []
    pendingHeaders = []

    const date =
      excelDateToJs(cell(row, cols.date)) ?? excelDateToJs(cell(row, cols.dateTime))

    let rawInvoices = findInvoiceCell(row, cols, cols.invoices)
    if (!rawInvoices) {
      rawInvoices = findOrphanInvoiceList(rows, i + 1, cols)
    }
    const invoiceIds = parseInvoiceIds(rawInvoices)
    const notes = cellText(row, cols.notes)
    const method = cellText(row, cols.method)
    const contact = cellText(row, cols.contact)

    result.push({
      reportClient,
      section,
      sectionPath,
      user,
      verificationType,
      style: parseVerificationStyle(method, contact),
      outcome: parseVerificationOutcome(notes),
      date,
      monthKey: date ? monthKeyFromDate(date) : null,
      invoiceCount: invoiceIds.length,
      invoiceIds,
      rawInvoices,
      notes,
    })
  }

  return result
}

export function listMonthKeys(rows: ReportRow[]): string[] {
  const keys = new Set<string>()
  for (const row of rows) {
    if (row.monthKey) keys.add(row.monthKey)
  }
  return [...keys].sort().reverse()
}

export function filterByMonth<T extends { monthKey: string | null }>(
  rows: T[],
  monthKey: string | null,
): T[] {
  if (!monthKey) return rows
  return rows.filter((r) => r.monthKey === monthKey)
}
