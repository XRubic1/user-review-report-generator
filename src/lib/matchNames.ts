/**
 * Fast client matching: normalize → Map lookup.
 *
 * Keep digits and initials (2, 3, A&M, R.J.S., T&T). Dropping them
 * collapsed many names to "logistics" / "express logistics" and broke matching.
 */

const SPLITTERS =
  /\b(dba|d\/b\/a|fka|f\/k\/a|aka|a\/k\/a|formerly|former|legal name)\b/i

const LEGAL_END = new Set([
  'llc',
  'inc',
  'corp',
  'ltd',
  'co',
  'lp',
  'pllc',
  'plc',
  'incorporated',
  'corporation',
  'company',
  'companies',
])

/** Too generic to be a sole match key */
const GENERIC_SOLO = new Set([
  'logistics',
  'logistic',
  'transport',
  'transportation',
  'transports',
  'freight',
  'express',
  'cargo',
  'solutions',
  'services',
  'service',
  'group',
  'truck',
  'trucking',
  'brokerage',
  'broker',
  'lines',
  'line',
  'usa',
  'america',
  'american',
  'international',
  'national',
  'global',
])

export function nameTokens(name: string): string[] {
  let s = name.trim().toLowerCase()
  // Drop trailing office codes in parens: (CHRCHI), (1320)
  s = s.replace(/\([^)]*\)/g, ' ')
  // Keep letters/digits; & / . become spaces so A&M → a m, R.J.S → r j s
  s = s.replace(/[^a-z0-9]+/g, ' ')
  s = s.replace(/\s+/g, ' ').trim()

  const raw = s.split(' ').filter(Boolean)

  // Strip trailing legal suffixes only
  while (raw.length && LEGAL_END.has(raw[raw.length - 1]!)) {
    raw.pop()
  }
  // "limited" only if last (LIMITED LOGISTICS CORP keeps "limited")
  if (raw.length && raw[raw.length - 1] === 'limited') {
    // only strip if it's the sole remaining brand word? keep it — it's the brand
  }

  return raw
}

export function normalizeName(name: string): string {
  const primary = (name.split(SPLITTERS)[0] ?? name).trim()
  return nameTokens(primary).join(' ')
}

function isUsableKey(key: string): boolean {
  if (!key) return false
  const tokens = key.split(' ')
  if (tokens.length >= 2) return true
  const solo = tokens[0] ?? ''
  if (solo.length < 3) return false
  if (GENERIC_SOLO.has(solo)) return false
  return true
}

/** Precomputed lookup: normalized key → canonical Clients-list name */
export type ClientIndex = Map<string, string>

export function buildClientIndex(clientList: string[]): ClientIndex {
  const index: ClientIndex = new Map()
  for (const raw of clientList) {
    const key = normalizeName(raw)
    if (!isUsableKey(key)) continue
    if (!index.has(key)) index.set(key, raw)
  }
  return index
}

export function matchClientIndex(
  reportName: string,
  index: ClientIndex,
): string | null {
  const key = normalizeName(reportName)
  if (!isUsableKey(key)) return null
  return index.get(key) ?? null
}

export function matchClientListName(
  reportName: string,
  clientList: string[],
): string | null {
  return matchClientIndex(reportName, buildClientIndex(clientList))
}

export function namesMatch(a: string, b: string): boolean {
  const na = normalizeName(a)
  const nb = normalizeName(b)
  if (!isUsableKey(na) || !isUsableKey(nb)) return false
  return na === nb
}

export function shortClientLabel(name: string): string {
  const tokens = nameTokens(name)
  return tokens[0] ?? name
}
