import { supabase, isSupabaseConfigured } from './supabase'

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

function readLocalStore() {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return { players: [], games: [] }
  const store = JSON.parse(raw)
  if (!Array.isArray(store.players) || !Array.isArray(store.games)) {
    throw new Error('Kohalikud mänguandmed on vigased. Ekspordi andmed enne nende parandamist.')
  }
  return store
}

function writeLocalStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

function newId() {
  return crypto.randomUUID()
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
    if (store.players.some((player) => player.name.toLocaleLowerCase() === name.trim().toLocaleLowerCase())) {
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
    if (store.players.some((player) => player.id !== id && player.name.toLocaleLowerCase() === fields.name.trim().toLocaleLowerCase())) {
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
export async function createGame({ gameType, playedAt, expansions = [], notes, scores }) {
  if (!isSupabaseConfigured) {
    const store = readLocalStore()
    const gameId = newId()
    const gameScores = scores.map((score) => ({
      id: newId(),
      game_id: gameId,
      player_id: score.player_id,
      breakdown: score.breakdown,
      total: Object.values(score.breakdown).reduce((sum, value) => sum + Number(value || 0), 0),
      placement: 1,
    }))
    for (const score of gameScores) {
      score.placement = gameScores.filter((other) => other.total > score.total).length + 1
    }
    const game = {
      id: gameId,
      game_type: gameType,
      played_at: playedAt,
      expansions,
      notes: notes.trim() || null,
      created_at: new Date().toISOString(),
      game_scores: gameScores,
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

export async function fetchGames(gameType) {
  if (!isSupabaseConfigured) {
    const store = readLocalStore()
    return store.games
      .filter((game) => !gameType || game.game_type === gameType)
      .map((game) => ({
        ...game,
        expansions: game.expansions ?? [],
        game_scores: game.game_scores.map((score) => ({
          ...score,
          player: store.players.find((player) => player.id === score.player_id),
        })),
      }))
      .sort((a, b) => b.played_at.localeCompare(a.played_at) || b.created_at.localeCompare(a.created_at))
  }
  let query = supabase
    .from('games')
    .select('id, game_type, played_at, expansions, notes, created_at, game_scores(id, total, placement, breakdown, player:players(id, name, color))')
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

// ---------- Statistika ----------
export async function fetchPlayerStats(gameType) {
  if (!isSupabaseConfigured) return localPlayerStats(gameType)
  return unwrap(await supabase.from('player_stats').select('*').eq('game_type', gameType))
}
