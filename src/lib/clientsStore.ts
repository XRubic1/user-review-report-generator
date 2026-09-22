const STORAGE_KEY = 'urrg.clients.v1'

export type ClientWithUsers = {
  id: string
  name: string
  /** Column B A/E (not used for team ownership) */
  accountExec: string
  /** Columns C+ team users */
  users: string[]
}

/** Map of lowercase user name → set of assigned client names (original casing). */
export type UserClientMap = Map<string, Set<string>>

function newId(): string {
  return crypto.randomUUID()
}

function readStore(): ClientWithUsers[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ClientWithUsers[]
    if (!Array.isArray(parsed)) return []
    return parsed.map((c) => ({
      id: c.id || newId(),
      name: c.name,
      accountExec: c.accountExec ?? '',
      users: Array.isArray(c.users) ? c.users : [],
    }))
  } catch {
    return []
  }
}

function writeStore(clients: ClientWithUsers[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clients))
}

export function fetchClientsWithUsers(): ClientWithUsers[] {
  return readStore()
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function toUserClientMap(clients: ClientWithUsers[]): UserClientMap {
  const map: UserClientMap = new Map()
  for (const client of clients) {
    for (const user of client.users) {
      const key = user.trim().toLowerCase()
      if (!key) continue
      const set = map.get(key) ?? new Set<string>()
      set.add(client.name)
      map.set(key, set)
    }
  }
  return map
}

/** All client names from the uploaded Clients list (carriers). */
export function toClientNameSet(clients: ClientWithUsers[]): string[] {
  return clients.map((c) => c.name).filter((n) => n.trim())
}

/** True when report user is on the client's team (columns C+). */
export function userOnClientTeam(
  teamUsers: string[],
  reportUser: string,
): boolean {
  const key = reportUser.trim().toLowerCase()
  if (!key) return false
  return teamUsers.some((u) => u.trim().toLowerCase() === key)
}

/** Full replace from Clients upload (A=name, B=A/E, C+=team). */
export function replaceClientMatrix(
  rows: { client: string; accountExec?: string; users: string[] }[],
): void {
  const clients: ClientWithUsers[] = []
  const seen = new Set<string>()

  for (const row of rows) {
    const name = row.client.trim()
    if (!name) continue
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)

    const users: string[] = []
    const userSeen = new Set<string>()
    for (const u of row.users) {
      const trimmed = u.trim()
      if (!trimmed) continue
      const uk = trimmed.toLowerCase()
      if (userSeen.has(uk)) continue
      userSeen.add(uk)
      users.push(trimmed)
    }

    clients.push({
      id: newId(),
      name,
      accountExec: (row.accountExec ?? '').trim(),
      users,
    })
  }

  writeStore(clients)
}

/** @deprecated prefer replaceClientMatrix on full upload */
export function upsertClientMatrix(
  rows: { client: string; accountExec?: string; users: string[] }[],
): void {
  replaceClientMatrix(rows)
}

export function clearClients(): void {
  writeStore([])
}
