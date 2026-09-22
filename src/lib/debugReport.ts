import type { ReportRow } from './parseReport'
import {
  buildClientIndex,
  matchClientIndex,
  normalizeName,
} from './matchNames'

export type SectionDebug = {
  reportName: string
  normalized: string
  batches: number
  invoices: number
  matched: boolean
  matchedAs: string | null
  users: string[]
  styles: Record<string, number>
  types: Record<string, number>
}

export type DebugReport = {
  generatedAt: string
  clientListCount: number
  clientListSample: { raw: string; normalized: string }[]
  reportRowCount: number
  emptyClientRows: number
  users: string[]
  months: string[]
  styleTotals: Record<string, number>
  typeTotals: Record<string, number>
  sections: SectionDebug[]
  matchedSections: number
  unmatchedSections: number
  unusedClientListNames: string[]
  nearMisses: { reportName: string; bestListName: string; reportNorm: string; listNorm: string }[]
  sampleRows: {
    client: string
    user: string
    type: string
    style: string
    invoices: number
    invoiceIds: string
    notes: string
    month: string | null
  }[]
}

function bump(map: Record<string, number>, key: string, n = 1) {
  map[key] = (map[key] ?? 0) + n
}

export function buildDebugReport(
  rows: ReportRow[],
  clientList: string[],
): DebugReport {
  const index = buildClientIndex(clientList)
  const styleTotals: Record<string, number> = {}
  const typeTotals: Record<string, number> = {}
  const users = new Set<string>()
  const months = new Set<string>()
  let emptyClientRows = 0

  const bySection = new Map<
    string,
    {
      reportName: string
      batches: number
      invoices: number
      users: Set<string>
      styles: Record<string, number>
      types: Record<string, number>
    }
  >()

  for (const row of rows) {
    users.add(row.user)
    if (row.monthKey) months.add(row.monthKey)
    bump(styleTotals, row.style, row.invoiceCount)
    bump(typeTotals, row.verificationType, 1)

    const section = row.section.trim()
    if (!section) {
      emptyClientRows += 1
      continue
    }

    const key = section.toLowerCase()
    let entry = bySection.get(key)
    if (!entry) {
      entry = {
        reportName: section,
        batches: 0,
        invoices: 0,
        users: new Set(),
        styles: {},
        types: {},
      }
      bySection.set(key, entry)
    }
    entry.batches += 1
    entry.invoices += row.invoiceCount
    entry.users.add(row.user)
    bump(entry.styles, row.style, row.invoiceCount)
    bump(entry.types, row.verificationType, 1)
  }

  const sections: SectionDebug[] = [...bySection.values()]
    .map((s) => {
      const matchedAs = matchClientIndex(s.reportName, index)
      return {
        reportName: s.reportName,
        normalized: normalizeName(s.reportName),
        batches: s.batches,
        invoices: s.invoices,
        matched: Boolean(matchedAs),
        matchedAs,
        users: [...s.users].sort(),
        styles: s.styles,
        types: s.types,
      }
    })
    .sort((a, b) => b.invoices - a.invoices || a.reportName.localeCompare(b.reportName))

  const matchedSections = sections.filter((s) => s.matched).length
  const unmatchedSections = sections.length - matchedSections

  const matchedKeys = new Set(
    sections.filter((s) => s.matchedAs).map((s) => normalizeName(s.matchedAs!)),
  )
  const unusedClientListNames = clientList
    .filter((c) => !matchedKeys.has(normalizeName(c)))
    .slice(0, 50)

  const sampleRows = rows.slice(0, 12).map((r) => ({
    client: r.section,
    user: r.user,
    type: r.verificationType,
    style: r.style,
    invoices: r.invoiceCount,
    invoiceIds: r.invoiceIds.join(', '),
    notes: r.notes.slice(0, 60),
    month: r.monthKey,
  }))

  const report: DebugReport = {
    generatedAt: new Date().toISOString(),
    clientListCount: clientList.length,
    clientListSample: clientList.slice(0, 30).map((raw) => ({
      raw,
      normalized: normalizeName(raw),
    })),
    reportRowCount: rows.length,
    emptyClientRows,
    users: [...users].sort(),
    months: [...months].sort().reverse(),
    styleTotals,
    typeTotals,
    sections,
    matchedSections,
    unmatchedSections,
    unusedClientListNames,
    nearMisses: [],
    sampleRows,
  }

  console.group('[URRG Debug]')
  console.log({
    rows: report.reportRowCount,
    clients: report.clientListCount,
    matched: matchedSections,
    unmatched: unmatchedSections,
  })
  console.groupEnd()

  return report
}
