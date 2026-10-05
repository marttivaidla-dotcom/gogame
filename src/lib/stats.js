// Statistika arvutamine mängude nimekirjast (fetchGames() väljund).
// Töötab ühtemoodi nii kohaliku salvestuse kui ka Supabase'iga.

const chronological = (games) =>
  [...games].sort((a, b) => a.played_at.localeCompare(b.played_at) || a.created_at.localeCompare(b.created_at))

// Mängija kaupa: mänge, võite, keskmine, parim, kohad ajalises järjekorras, kategooriate summad
export function playerSummaries(games) {
  const rows = new Map()
  for (const game of chronological(games)) {
    for (const s of game.game_scores) {
      if (!s.player) continue
      const row = rows.get(s.player.id) ?? { player: s.player, games: 0, wins: 0, sum: 0, best: 0, places: [] }
      row.games += 1
      row.wins += s.placement === 1 ? 1 : 0
      row.sum += s.total
      row.best = Math.max(row.best, s.total)
      row.places.push(s.placement)
      rows.set(s.player.id, row)
    }
  }
  return [...rows.values()].map((r) => ({ ...r, avg: r.sum / r.games, winPct: r.wins / r.games }))
}

// Kahe mängija omavahelised tulemused mängudes, kus mõlemad osalesid
export function headToHead(games, aId, bId) {
  const result = { games: 0, aWins: 0, bWins: 0, ties: 0, diff: 0, sequence: [] }
  for (const game of chronological(games)) {
    const a = game.game_scores.find((s) => s.player?.id === aId)
    const b = game.game_scores.find((s) => s.player?.id === bId)
    if (!a || !b) continue
    result.games += 1
    result.diff += a.total - b.total
    if (a.total > b.total) {
      result.aWins += 1
      result.sequence.push('a')
    } else if (b.total > a.total) {
      result.bWins += 1
      result.sequence.push('b')
    } else {
      result.ties += 1
      result.sequence.push('tie')
    }
  }
  result.avgDiff = result.games ? result.diff / result.games : 0
  return result
}

// Paar, kes on koos kõige rohkem mänginud (omavahelise seisu vaikevalik)
export function mostFrequentPair(games) {
  const counts = new Map()
  for (const game of games) {
    const ids = game.game_scores.map((s) => s.player?.id).filter(Boolean).sort()
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const key = `${ids[i]}|${ids[j]}`
        counts.set(key, (counts.get(key) ?? 0) + 1)
      }
    }
  }
  const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
  return best ? best[0].split('|') : []
}

// Libisev keskmine (viimased `window` mängu) iga mängija kohta, kellel on vähemalt minGames mängu
export function rollingAverages(games, { window = 10, minGames = 10 } = {}) {
  const series = new Map()
  for (const game of chronological(games)) {
    for (const s of game.game_scores) {
      if (!s.player) continue
      const entry = series.get(s.player.id) ?? { player: s.player, recent: [], points: [] }
      entry.recent.push(s.total)
      if (entry.recent.length > window) entry.recent.shift()
      const avg = entry.recent.reduce((sum, v) => sum + v, 0) / entry.recent.length
      entry.points.push({ date: game.played_at, total: s.total, avg: entry.recent.length >= Math.min(5, window) ? avg : null })
      series.set(s.player.id, entry)
    }
  }
  return [...series.values()]
    .filter((s) => s.points.length >= minGames)
    .sort((a, b) => b.points.length - a.points.length)
    .map(({ player, points }) => ({ player, points }))
}

// Rekordid: suurim tulemus, iga kategooria maksimum, suurim võiduvahe, viigid
export function records(games, categories) {
  const scores = games.flatMap((g) => g.game_scores.filter((s) => s.player).map((s) => ({ ...s, date: g.played_at })))
  if (!scores.length) return null
  const maxBy = (value) => scores.reduce((best, s) => (value(s) > value(best) ? s : best))
  const multi = games.filter((g) => g.game_scores.length > 1)
  const margin = (g) => {
    const t = g.game_scores.map((s) => s.total).sort((a, b) => b - a)
    return t[0] - t[1]
  }
  const biggest = multi.length ? multi.reduce((best, g) => (margin(g) > margin(best) ? g : best)) : null
  return {
    top: maxBy((s) => s.total),
    categories: categories.map((c) => ({ category: c, score: maxBy((s) => Number(s.breakdown[c.key]) || 0) })),
    biggestWin: biggest && {
      margin: margin(biggest),
      date: biggest.played_at,
      winner: biggest.game_scores.find((s) => s.placement === 1)?.player,
    },
    ties: multi.filter((g) => margin(g) === 0).length,
    nights: new Set(games.map((g) => g.played_at)).size,
    avgWinning: multi.length ? multi.reduce((sum, g) => sum + Math.max(...g.game_scores.map((s) => s.total)), 0) / multi.length : null,
  }
}
