import { supabase, isSupabaseConfigured } from './supabase'
import { WINGSPAN_HISTORY } from '../data/wingspanHistory'
import { gameSignature } from './legacyImport'
import { PLAYER_COLORS, placements } from './scoring'

const STORAGE_KEY = 'skoorivihik:data:v1'

function unwrap({ data, error }) {
  if (error) throw new Error(friendlyError(error))
  return data
}

// Tagastab tõlkevõtme (vt src/i18n/translations.js) või Supabase'i algse teate
function friendlyError(error) {
  if (error.code === '23505') return 'errors.duplicateName'
  if (error.code === '23503') return 'errors.hasGames'
  return error.message
}

function newId() {
  return crypto.randomUUID()
}

const nameKey = (name) => name.trim().toLocaleLowerCase('et')

// Mängijate tulemused koos summa ja kohaga (võrdse summa korral jagatakse koht: 1, 1, 3)
function scoreRows(gameId, scores) {
  const totals = scores.map((s) => Object.values(s.breakdown).reduce((sum, v) => sum + (Number(v) || 0), 0))
  const places = placements(totals)
  return scores.map((s, i) => ({
    id: newId(),
    game_id: gameId,
    player_id: s.player_id,
    breakdown: s.breakdown,
    total: totals[i],
    placement: places[i],
  }))
}

// Esimesel kasutamisel (brauseris pole veel andmeid) algab kohalik salvestus varasemate mängudega
function historyStore() {
  const players = []
  const byName = new Map()
  const games = WINGSPAN_HISTORY.map((g) => {
    const gameId = newId()
    const scores = g.scores.map((s) => {
      if (!byName.has(nameKey(s.name))) {
        const player = {
          id: newId(),
          name: s.name,
          color: PLAYER_COLORS[players.length % PLAYER_COLORS.length],
          created_at: new Date().toISOString(),
        }
        players.push(player)
        byName.set(nameKey(s.name), player)
      }
      return { player_id: byName.get(nameKey(s.name)).id, breakdown: s.breakdown }
    })
    return {
      id: gameId,
      game_type: 'wingspan',
      played_at: g.date,
      expansions: [],
      notes: null,
      created_at: new Date(g.savedAt.replace(' ', 'T')).toISOString(),
      game_scores: scoreRows(gameId, scores),
    }
  })
  return { players, games }
}

function readLocalStore() {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    const store = historyStore()
    writeLocalStore(store)
    return store
  }
  const store = JSON.parse(raw)
  if (!Array.isArray(store.players) || !Array.isArray(store.games)) throw new Error('errors.badLocalData')
  return store
}

function writeLocalStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

function localPlayerStats(gameType) {
  const store = readLocalStore()
  const rows = new Map()
  for (const game of store.games.filter((item) => item.game_type === gameType)) {
    for (const score of game.game_scores) {
      const player = store.players.find((item) => item.id === score.player_id)
      if (!player) continue
      const row = rows.get(player.id) ?? {
        player_id: player.id,
        name: player.name,
        color: player.color,
        game_type: gameType,
        games_played: 0,
        wins: 0,
        total: 0,
        best_score: 0,
        worst_score: Infinity,
      }
      row.games_played += 1
      row.wins += Number(score.placement === 1)
      row.total += score.total
      row.best_score = Math.max(row.best_score, score.total)
      row.worst_score = Math.min(row.worst_score, score.total)
      rows.set(player.id, row)
    }
  }
  return [...rows.values()].map(({ total, ...row }) => ({
    ...row,
    avg_score: Math.round((total / row.games_played) * 10) / 10,
  }))
}

// ---------- Mängijad ----------
export async function fetchPlayers() {
  if (!isSupabaseConfigured) return readLocalStore().players.sort((a, b) => a.name.localeCompare(b.name))
  return unwrap(await supabase.from('players').select('*').order('name'))
}

export async function addPlayer(name, color) {
  if (!isSupabaseConfigured) {
    const store = readLocalStore()
    if (store.players.some((player) => nameKey(player.name) === nameKey(name))) {
      throw new Error('errors.duplicateName')
    }
    const player = { id: newId(), name: name.trim(), color, created_at: new Date().toISOString() }
    writeLocalStore({ ...store, players: [...store.players, player] })
    return player
  }
  return unwrap(await supabase.from('players').insert({ name: name.trim(), color }).select().single())
}

export async function updatePlayer(id, fields) {
  if (!isSupabaseConfigured) {
    const store = readLocalStore()
    if (store.players.some((player) => player.id !== id && nameKey(player.name) === nameKey(fields.name))) {
      throw new Error('errors.duplicateName')
    }
    const players = store.players.map((player) => player.id === id ? { ...player, ...fields } : player)
    writeLocalStore({ ...store, players })
    return players.find((player) => player.id === id)
  }
  return unwrap(await supabase.from('players').update(fields).eq('id', id).select().single())
}

export async function deletePlayer(id) {
  if (!isSupabaseConfigured) {
    const store = readLocalStore()
    if (store.games.some((game) => game.game_scores.some((score) => score.player_id === id))) {
      throw new Error('errors.hasGames')
    }
    writeLocalStore({ ...store, players: store.players.filter((player) => player.id !== id) })
    return
  }
  return unwrap(await supabase.from('players').delete().eq('id', id))
}

// ---------- Mängud ----------
export async function createGame({ gameType, playedAt, expansions = [], notes = '', scores }) {
  if (!isSupabaseConfigured) {
    const store = readLocalStore()
    const gameId = newId()
    const game = {
      id: gameId,
      game_type: gameType,
      played_at: playedAt,
      expansions,
      notes: notes.trim() || null,
      created_at: new Date().toISOString(),
      game_scores: scoreRows(gameId, scores),
    }
    writeLocalStore({ ...store, games: [...store.games, game] })
    return gameId
  }
  return unwrap(
    await supabase.rpc('create_game', {
      p_game_type: gameType,
      p_played_at: playedAt,
      p_notes: notes,
      p_expansions: expansions,
      p_scores: scores,
    }),
  )
}

// Mängu muutmine: kuupäev, laiendused, märkmed ja kõigi mängijate punktid asendatakse
export async function updateGame(id, { playedAt, expansions = [], notes = '', scores }) {
  const rows = scoreRows(id, scores)
  if (!isSupabaseConfigured) {
    const store = readLocalStore()
    const games = store.games.map((game) =>
      game.id === id
        ? { ...game, played_at: playedAt, expansions, notes: notes.trim() || null, game_scores: rows }
        : game,
    )
    writeLocalStore({ ...store, games })
    return id
  }
  unwrap(
    await supabase.from('games').update({ played_at: playedAt, expansions, notes: notes.trim() || null }).eq('id', id),
  )
  unwrap(await supabase.from('game_scores').delete().eq('game_id', id))
  unwrap(await supabase.from('game_scores').insert(rows.map(({ id: _rowId, ...row }) => row)))
  return id
}

const GAME_SELECT =
  'id, game_type, played_at, expansions, notes, created_at, game_scores(id, total, placement, breakdown, player:players(id, name, color))'

function withPlayers(store, game) {
  return {
    ...game,
    expansions: game.expansions ?? [],
    game_scores: game.game_scores.map((score) => ({
      ...score,
      player: store.players.find((player) => player.id === score.player_id),
    })),
  }
}

export async function fetchGame(id) {
  if (!isSupabaseConfigured) {
    const store = readLocalStore()
    const game = store.games.find((item) => item.id === id)
    if (!game) throw new Error('errors.gameNotFound')
    return withPlayers(store, game)
  }
  const game = unwrap(await supabase.from('games').select(GAME_SELECT).eq('id', id).maybeSingle())
  if (!game) throw new Error('errors.gameNotFound')
  return game
}

export async function fetchGames(gameType) {
  if (!isSupabaseConfigured) {
    const store = readLocalStore()
    return store.games
      .filter((game) => !gameType || game.game_type === gameType)
      .map((game) => withPlayers(store, game))
      .sort((a, b) => b.played_at.localeCompare(a.played_at) || b.created_at.localeCompare(a.created_at))
  }
  let query = supabase
    .from('games')
    .select(GAME_SELECT)
    .order('played_at', { ascending: false })
    .order('created_at', { ascending: false })
  if (gameType) query = query.eq('game_type', gameType)
  return unwrap(await query)
}

export async function deleteGame(id) {
  if (!isSupabaseConfigured) {
    const store = readLocalStore()
    writeLocalStore({ ...store, games: store.games.filter((game) => game.id !== id) })
    return
  }
  return unwrap(await supabase.from('games').delete().eq('id', id))
}

// ---------- Import ----------
export { WINGSPAN_HISTORY }

// games: parseLegacyWingspan() väljund või WINGSPAN_HISTORY. Puuduvad mängijad luuakse nime järgi.
// Juba olemasolevaid mänge (sama kuupäev, mängijad ja summad) ei lisata uuesti,
// arvestades kordusi: kui andmebaasis on sama mäng 1 kord ja impordis 2 korda, lisatakse 1.
export async function importGames(gameType, games, onProgress) {
  const players = await fetchPlayers()
  const byName = new Map(players.map((p) => [nameKey(p.name), p]))
  let playersCreated = 0
  for (const name of new Set(games.flatMap((g) => g.scores.map((s) => s.name)))) {
    if (byName.has(nameKey(name))) continue
    const color = PLAYER_COLORS[(players.length + playersCreated) % PLAYER_COLORS.length]
    byName.set(nameKey(name), await addPlayer(name, color))
    playersCreated += 1
  }

  const existing = new Map()
  for (const g of await fetchGames(gameType)) {
    const scores = g.game_scores.filter((s) => s.player).map((s) => ({ name: s.player.name, total: s.total }))
    const sig = gameSignature(g.played_at, scores)
    existing.set(sig, (existing.get(sig) ?? 0) + 1)
  }

  let imported = 0
  let skipped = 0
  for (const [i, game] of games.entries()) {
    const sig = gameSignature(game.date, game.scores)
    if (existing.get(sig) > 0) {
      existing.set(sig, existing.get(sig) - 1)
      skipped += 1
    } else {
      await createGame({
        gameType,
        playedAt: game.date,
        scores: game.scores.map((s) => ({ player_id: byName.get(nameKey(s.name)).id, breakdown: s.breakdown })),
      })
      imported += 1
    }
    onProgress?.(i + 1)
  }
  return { imported, skipped, playersCreated }
}

// ---------- Statistika ----------
export async function fetchPlayerStats(gameType) {
  if (!isSupabaseConfigured) return localPlayerStats(gameType)
  return unwrap(await supabase.from('player_stats').select('*').eq('game_type', gameType))
}
