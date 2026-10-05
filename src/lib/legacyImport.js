// Vana Wingspani skooritabeli (tabeldusmärkidega eraldatud, nt Google Sheetsist
// kopeeritud) teisendamine selle rakenduse mänguandmeteks.
//
// Oodatud päis: "Mängu nr", "Salvestamise aeg", "Mängija N nimi",
// "Mängija N - <kategooria>", "Mängija N - Kokku" (N = 1…6).

const LEGACY_FIELDS = {
  'sulgede summa': 'birds',
  boonuskaartidel: 'bonus_cards',
  'vooru lõpp': 'round_goals',
  mune: 'eggs',
  'toit kaartidel': 'cached_food',
  'alla kogunenud kaarte': 'tucked_cards',
}

function toNumber(value) {
  const n = parseInt(String(value ?? '').trim(), 10)
  return Number.isFinite(n) ? n : 0
}

function parseHeader(header) {
  const slots = new Map()
  const slot = (n) => {
    if (!slots.has(n)) slots.set(n, { name: -1, total: -1, fields: {} })
    return slots.get(n)
  }
  let nrCol = -1
  let timeCol = -1

  header.forEach((raw, i) => {
    const h = raw.trim().toLocaleLowerCase('et')
    if (h.startsWith('mängu nr')) nrCol = i
    else if (h.startsWith('salvestamise aeg')) timeCol = i
    let m = h.match(/^mängija (\d+) nimi$/)
    if (m) slot(m[1]).name = i
    m = h.match(/^mängija (\d+) - (.+)$/)
    if (m) {
      if (m[2] === 'kokku') slot(m[1]).total = i
      else if (LEGACY_FIELDS[m[2]]) slot(m[1]).fields[LEGACY_FIELDS[m[2]]] = i
    }
  })

  const players = [...slots.values()].filter((s) => s.name >= 0 && Object.keys(s.fields).length > 0)
  if (timeCol < 0 || players.length === 0) throw new Error('import.badFormat')
  return { nrCol, timeCol, players }
}

// Mängu "sõrmejälg" duplikaatide leidmiseks: kuupäev + mängijad ja nende summad
export function gameSignature(date, scores) {
  const parts = scores.map((s) => `${s.name.toLocaleLowerCase('et')}:${s.total}`).sort()
  return `${date}|${parts.join(',')}`
}

function breakdownSignature(game) {
  return JSON.stringify(
    game.scores.map((s) => [s.name.toLocaleLowerCase('et'), s.breakdown]).sort((a, b) => a[0].localeCompare(b[0])),
  )
}

/**
 * Tagastab { games, stats, warnings }.
 * games: [{ nr, savedAt, date, repeat, scores: [{ name, breakdown, total }] }], vanimast uuemani.
 * Iga rida on eraldi mäng ("Mängu nr" ei ole unikaalne). Vahele jäetakse ainult
 * mängijad, kellel nimi puudub või kõik punktid on 0, ja read, kus pole ühtegi mängijat.
 * repeat = true, kui samal päeval on juba täpselt sama tulemusega rida (kasutaja otsustab).
 */
export function parseLegacyWingspan(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim())
  if (lines.length < 2) throw new Error('import.badFormat')
  const { nrCol, timeCol, players } = parseHeader(lines[0].split('\t'))

  const warnings = []
  const stats = { rows: lines.length - 1, empty: 0, repeats: 0 }
  const rows = []

  for (const line of lines.slice(1)) {
    const cells = line.split('\t')
    const savedAt = (cells[timeCol] ?? '').trim()
    const time = Date.parse(savedAt.replace(' ', 'T'))
    if (!Number.isFinite(time)) {
      warnings.push({ key: 'import.warnBadDate', vars: { value: savedAt || '—' } })
      continue
    }
    const nr = nrCol >= 0 ? (cells[nrCol] ?? '').trim() : ''
    const scores = []
    for (const p of players) {
      const name = (cells[p.name] ?? '').trim()
      const breakdown = Object.fromEntries(Object.entries(p.fields).map(([key, col]) => [key, toNumber(cells[col])]))
      const total = Object.values(breakdown).reduce((sum, v) => sum + v, 0)
      if (!name || total === 0) continue
      if (p.total >= 0 && toNumber(cells[p.total]) !== total) {
        warnings.push({ key: 'import.warnTotal', vars: { nr, name, stated: toNumber(cells[p.total]), total } })
      }
      scores.push({ name, breakdown, total })
    }
    if (scores.length === 0) {
      stats.empty += 1
      continue
    }
    rows.push({ nr, savedAt, time, date: savedAt.slice(0, 10), scores })
  }

  rows.sort((a, b) => a.time - b.time)

  const seen = new Set()
  const games = rows.map(({ time, ...row }) => {
    const sig = `${row.date}|${breakdownSignature(row)}`
    const repeat = seen.has(sig)
    seen.add(sig)
    if (repeat) stats.repeats += 1
    return { ...row, repeat }
  })

  return { games, stats, warnings }
}
