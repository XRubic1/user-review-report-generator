import * as XLSX from 'xlsx'

export type ClientMatrixRow = {
  client: string
  /** Account executive from column B (informational) */
  accountExec: string
  /**
   * Team users from columns C onward.
   * Report user must appear here for the client to count as theirs.
   */
  users: string[]
}

export function parseClientMatrixFile(file: ArrayBuffer): ClientMatrixRow[] {
  const workbook = XLSX.read(file, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) return []

  const sheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
  })

  const result: ClientMatrixRow[] = []

  for (const row of rows) {
    if (!row || !Array.isArray(row)) continue
    const client = String(row[0] ?? '').trim()
    if (!client) continue

    const lower = client.toLowerCase()
    if (
      lower === 'client' ||
      lower === 'clients' ||
      lower === 'name' ||
      lower === 'a/e'
    ) {
      continue
    }

    const accountExec = String(row[1] ?? '').trim()
    // C, D, E, F, G, … — not B (A/E)
    const users: string[] = []
    const seen = new Set<string>()
    for (let i = 2; i < row.length; i++) {
      const user = String(row[i] ?? '').trim()
      if (!user) continue
      const key = user.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      users.push(user)
    }

    result.push({ client, accountExec, users })
  }

  return result
}
