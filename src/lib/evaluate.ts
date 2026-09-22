import type { VerificationStyle } from './parseReport'
import type { ReportRow } from './parseReport'
import type { ClientWithUsers } from './clientsStore'
import { userOnClientTeam } from './clientsStore'
import {
  buildClientIndex,
  matchClientIndex,
  normalizeName,
} from './matchNames'

export type UserMetrics = {
  user: string
  reportClient: string
  invoices: number
  verifiedInvoices: number
  notVerifiedInvoices: number
  webInvoices: number
  phoneInvoices: number
  emailInvoices: number
  otherStyleInvoices: number
  verCount: number
  pverCount: number
  /**
   * Invoices not under a Clients-list carrier assigned to this user
   * (columns C+). Includes other teams' carriers and unmatched brokers.
   */
  outsideInvoices: number
  outsideBatches: number
  totalBatches: number
}

export type EntityBreakdown = {
  name: string
  invoices: number
  invoiceIds: string[]
  verifiedInvoices: number
  notVerifiedInvoices: number
  webInvoices: number
  phoneInvoices: number
  emailInvoices: number
  batches: number
  verCount: number
  pverCount: number
}

export type UserDetail = {
  user: string
  reportClient: string
  metrics: UserMetrics
  /** On Clients list + this user on columns C+ */
  carriers: EntityBreakdown[]
  /** Unmatched column A under this user’s carriers */
  brokers: EntityBreakdown[]
  /**
   * Clients-list carriers this user worked under but is not assigned to (C+).
   */
  otherCarriers: EntityBreakdown[]
  topCarrier: EntityBreakdown | null
}

export type TaggedRow = ReportRow & {
  /** Clients-list name for the active carrier span (any list match) */
  carrier: string | null
  /** Team users (columns C+) for that carrier */
  carrierTeamUsers: string[]
  /** Section is not on Clients list */
  isBroker: boolean
}

export {
  buildClientIndex,
  matchClientIndex,
  matchClientListName,
  normalizeName,
  namesMatch,
  shortClientLabel,
  type ClientIndex,
} from './matchNames'

function teamUsersForClient(
  clients: ClientWithUsers[],
  clientName: string,
): string[] {
  const key = clientName.trim().toLowerCase()
  const hit = clients.find((c) => c.name.trim().toLowerCase() === key)
  return hit?.users ?? []
}

/** Carrier counts for this report user only if they are on columns C+. */
export function rowIsUsersCarrier(row: TaggedRow, reportUser: string): boolean {
  return Boolean(row.carrier) && userOnClientTeam(row.carrierTeamUsers, reportUser)
}

/**
 * Column A walk (sheet order):
 * - Name on Clients list → start/switch carrier span (header-only via sectionPath)
 * - Unmatched names → brokers under current carrier
 * - Per user: carrier only "inside" if user is on that client's columns C+
 */
export function tagRowsWithCarriers(
  rows: ReportRow[],
  clients: ClientWithUsers[] | string[],
): TaggedRow[] {
  const clientRows: ClientWithUsers[] = clients.map((c) =>
    typeof c === 'string'
      ? { id: c, name: c, accountExec: '', users: [] }
      : c,
  )
  const index = buildClientIndex(clientRows.map((c) => c.name))
  const nameCache = new Map<string, string | null>()
  let currentCarrier: string | null = null
  let currentTeam: string[] = []

  function lookup(name: string): string | null {
    const key = name.trim()
    if (!key) return null
    if (nameCache.has(key)) return nameCache.get(key)!
    const matched = matchClientIndex(key, index)
    nameCache.set(key, matched)
    return matched
  }

  function activate(matched: string) {
    currentCarrier = matched
    currentTeam = teamUsersForClient(clientRows, matched)
  }

  return rows.map((row) => {
    const path =
      row.sectionPath?.length > 0
        ? row.sectionPath
        : row.section.trim()
          ? [row.section]
          : []

    for (const header of path) {
      const matchedHeader = lookup(header)
      if (matchedHeader) activate(matchedHeader)
    }

    const section = row.section.trim()
    const sectionMatch = section ? lookup(section) : null
    if (sectionMatch) {
      activate(sectionMatch)
      return {
        ...row,
        carrier: sectionMatch,
        carrierTeamUsers: currentTeam,
        isBroker: false,
      }
    }

    return {
      ...row,
      carrier: currentCarrier,
      carrierTeamUsers: currentTeam,
      isBroker: Boolean(section),
    }
  })
}

function addStyleInvoices(
  metrics: Pick<
    UserMetrics,
    'webInvoices' | 'phoneInvoices' | 'emailInvoices' | 'otherStyleInvoices'
  >,
  style: VerificationStyle,
  count: number,
) {
  if (style === 'WEB') metrics.webInvoices += count
  else if (style === 'Phone') metrics.phoneInvoices += count
  else if (style === 'Email') metrics.emailInvoices += count
  else metrics.otherStyleInvoices += count
}

function emptyMetrics(user: string, reportClient: string): UserMetrics {
  return {
    user,
    reportClient,
    invoices: 0,
    verifiedInvoices: 0,
    notVerifiedInvoices: 0,
    webInvoices: 0,
    phoneInvoices: 0,
    emailInvoices: 0,
    otherStyleInvoices: 0,
    verCount: 0,
    pverCount: 0,
    outsideInvoices: 0,
    outsideBatches: 0,
    totalBatches: 0,
  }
}

function emptyEntity(name: string): EntityBreakdown {
  return {
    name,
    invoices: 0,
    invoiceIds: [],
    verifiedInvoices: 0,
    notVerifiedInvoices: 0,
    webInvoices: 0,
    phoneInvoices: 0,
    emailInvoices: 0,
    batches: 0,
    verCount: 0,
    pverCount: 0,
  }
}

function accumulateEntity(entry: EntityBreakdown, row: ReportRow) {
  entry.batches += 1
  entry.invoices += row.invoiceCount
  for (const id of row.invoiceIds) {
    if (!entry.invoiceIds.includes(id)) entry.invoiceIds.push(id)
  }
  if (row.style === 'WEB') entry.webInvoices += row.invoiceCount
  if (row.style === 'Phone') entry.phoneInvoices += row.invoiceCount
  if (row.style === 'Email') entry.emailInvoices += row.invoiceCount
  entry.verifiedInvoices =
    entry.webInvoices + entry.phoneInvoices + entry.emailInvoices
  if (row.style === 'Other') entry.notVerifiedInvoices += row.invoiceCount
  if (row.verificationType === 'VER') entry.verCount += 1
  if (row.verificationType === 'P-VER') entry.pverCount += 1
}

function sortEntities(list: EntityBreakdown[]): EntityBreakdown[] {
  return list.sort(
    (a, b) =>
      b.invoices - a.invoices ||
      b.batches - a.batches ||
      a.name.localeCompare(b.name),
  )
}

export function evaluateTaggedUsers(tagged: TaggedRow[]): UserMetrics[] {
  const byUser = new Map<string, UserMetrics>()

  for (const row of tagged) {
    const user = row.user.trim()
    if (!user) continue

    const key = user.toLowerCase()
    let metrics = byUser.get(key)
    if (!metrics) {
      metrics = emptyMetrics(user, row.reportClient)
      byUser.set(key, metrics)
    }

    const inv = row.invoiceCount
    metrics.totalBatches += 1
    metrics.invoices += inv
    if (row.reportClient) metrics.reportClient = row.reportClient

    addStyleInvoices(metrics, row.style, inv)
    metrics.verifiedInvoices =
      metrics.webInvoices + metrics.phoneInvoices + metrics.emailInvoices
    metrics.notVerifiedInvoices = metrics.otherStyleInvoices

    if (row.verificationType === 'VER') metrics.verCount += 1
    if (row.verificationType === 'P-VER') metrics.pverCount += 1

    // Outside = no carrier, or carrier not assigned to this report user (C+)
    if (!rowIsUsersCarrier(row, user)) {
      metrics.outsideBatches += 1
      metrics.outsideInvoices += inv
    }
  }

  return [...byUser.values()].sort((a, b) => a.user.localeCompare(b.user))
}

export function evaluateUsers(
  rows: ReportRow[],
  clients: ClientWithUsers[] | string[],
): UserMetrics[] {
  return evaluateTaggedUsers(tagRowsWithCarriers(rows, clients))
}

export function evaluateUserDetail(
  tagged: TaggedRow[],
  userName: string,
): UserDetail | null {
  const userRows = tagged.filter(
    (r) => r.user.trim().toLowerCase() === userName.trim().toLowerCase(),
  )
  if (!userRows.length) return null

  const metrics = evaluateTaggedUsers(userRows)[0]
  const carrierMap = new Map<string, EntityBreakdown>()
  const brokerMap = new Map<string, EntityBreakdown>()
  const otherCarrierMap = new Map<string, EntityBreakdown>()

  for (const row of userRows) {
    const owned = rowIsUsersCarrier(row, userName)

    if (owned && row.carrier) {
      const key = normalizeName(row.carrier) || row.carrier.toLowerCase()
      let entry = carrierMap.get(key)
      if (!entry) {
        entry = emptyEntity(row.carrier)
        carrierMap.set(key, entry)
      }
      accumulateEntity(entry, row)
    }

    // Brokers under this user's carriers only
    if (owned && row.isBroker) {
      const section = row.section.trim() || '(unknown)'
      const key = normalizeName(section) || section.toLowerCase()
      let entry = brokerMap.get(key)
      if (!entry) {
        entry = emptyEntity(section)
        brokerMap.set(key, entry)
      }
      accumulateEntity(entry, row)
    }

    // Worked on a Clients-list carrier but user is not on that row's C+
    if (!owned && row.carrier) {
      const key = normalizeName(row.carrier) || row.carrier.toLowerCase()
      let entry = otherCarrierMap.get(key)
      if (!entry) {
        entry = emptyEntity(row.carrier)
        otherCarrierMap.set(key, entry)
      }
      accumulateEntity(entry, row)
    }
  }

  const carriers = sortEntities([...carrierMap.values()])
  const brokers = sortEntities([...brokerMap.values()])
  const otherCarriers = sortEntities([...otherCarrierMap.values()])

  return {
    user: metrics.user,
    reportClient: metrics.reportClient,
    metrics,
    carriers,
    brokers,
    otherCarriers,
    topCarrier: carriers[0] ?? null,
  }
}

export function pverNotes(rows: ReportRow[]): ReportRow[] {
  return rows
    .filter((r) => r.verificationType === 'P-VER')
    .sort((a, b) => {
      const ta = a.date?.getTime() ?? 0
      const tb = b.date?.getTime() ?? 0
      return tb - ta
    })
}
