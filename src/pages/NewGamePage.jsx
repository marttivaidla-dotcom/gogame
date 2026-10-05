import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import ScoreCalculator from '../components/ScoreCalculator'
import { Card, ErrorBox, Loading, PageTitle, PlayerDot, useLoader } from '../components/ui'
import { useI18n } from '../i18n/I18nProvider'
import { createGame, fetchGame, fetchPlayers, updateGame } from '../lib/api'
import { GAMES, GAME_LIST, breakdownToInputs, computeBreakdown, formatDate, visibleCategories } from '../lib/scoring'

const today = () => new Date().toLocaleDateString('sv-SE') // YYYY-MM-DD kohalikus ajas

// /uus-mang – uus mäng; /mang/:id/muuda – olemasoleva mängu muutmine
export default function NewGamePage() {
  const { id } = useParams()
  const { data, error, loading } = useLoader(
    async () => ({ players: await fetchPlayers(), game: id ? await fetchGame(id) : null }),
    [id],
  )

  if (loading) return <Loading />
  if (!data) return <ErrorBox>{error}</ErrorBox>
  return <GameForm key={id ?? 'new'} allPlayers={data.players} game={data.game} />
}

function GameForm({ allPlayers, game: existing }) {
  const navigate = useNavigate()
  const { t, tr, locale } = useI18n()

  const [gameType, setGameType] = useState(existing?.game_type ?? 'wingspan')
  const [expansions, setExpansions] = useState(existing?.expansions ?? [])
  const [playedAt, setPlayedAt] = useState(existing?.played_at ?? today)
  const [selectedIds, setSelectedIds] = useState(() => existing?.game_scores.map((s) => s.player.id) ?? [])
  const [inputs, setInputs] = useState(() =>
    existing
      ? Object.fromEntries(
          existing.game_scores.map((s) => [s.player.id, breakdownToInputs(GAMES[existing.game_type].categories, s.breakdown)]),
        )
      : {},
  )
  const [notes, setNotes] = useState(existing?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const game = GAMES[gameType]
  const categories = visibleCategories(gameType, expansions)
  const selectedPlayers = selectedIds.map((id) => allPlayers.find((p) => p.id === id)).filter(Boolean)

  function switchGame(key) {
    if (key === gameType) return
    const hasInput = Object.keys(inputs).length > 0
    if (hasInput && !confirm(t('newGame.switchConfirm'))) return
    setGameType(key)
    setExpansions([])
    setInputs({})
  }

  function togglePlayer(id) {
    setSelectedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))
  }

  function toggleExpansion(key) {
    setExpansions((list) => (list.includes(key) ? list.filter((x) => x !== key) : [...list, key]))
  }

  async function handleSave() {
    setError(null)
    if (selectedPlayers.length === 0) return setError(t('newGame.selectPlayer'))
    setSaving(true)
    const payload = {
      gameType,
      playedAt,
      expansions,
      notes,
      scores: selectedPlayers.map((p) => ({ player_id: p.id, breakdown: computeBreakdown(categories, inputs[p.id]) })),
    }
    try {
      if (existing) await updateGame(existing.id, payload)
      else await createGame(payload)
      navigate('/ajalugu')
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  return (
    <div>
      {existing ? (
        <PageTitle subtitle={t('editGame.subtitle', { date: formatDate(existing.played_at, locale) })}>{t('editGame.title')}</PageTitle>
      ) : (
        <PageTitle subtitle={t('newGame.subtitle')}>{t('newGame.title')}</PageTitle>
      )}

      {/* 1. Mängu valik (muutmisel mängu tüüpi ei vahetata) */}
      {!existing && (
        <div className="mb-6 grid grid-cols-2 gap-3">
          {GAME_LIST.map((g) => (
            <button
              key={g.key}
              type="button"
              onClick={() => switchGame(g.key)}
              className={`rounded-lg border bg-white p-4 text-left transition ${
                gameType === g.key ? 'border-stone-900 ring-1 ring-stone-900' : 'border-stone-200 hover:border-stone-400'
              }`}
            >
              <div className="font-semibold">{g.name}</div>
              <div className="text-xs text-stone-500">{tr(g.tagline)}</div>
            </button>
          ))}
        </div>
      )}

      {/* 2. Kuupäev, laiendused, mängijad */}
      <Card className="mb-6 space-y-4">
        <div className="flex flex-wrap items-end gap-6">
          <label className="text-sm font-medium">
            {t('newGame.date')}
            <input
              type="date"
              value={playedAt}
              onChange={(e) => setPlayedAt(e.target.value)}
              className="mt-1 block rounded-md border border-stone-300 px-2 py-1.5"
            />
          </label>
          {game.expansions.map((x) => (
            <label key={x.key} className="flex items-center gap-2 pb-2 text-sm">
              <input type="checkbox" checked={expansions.includes(x.key)} onChange={() => toggleExpansion(x.key)} />
              {tr(x.label)}
            </label>
          ))}
        </div>

        <div>
          <div className="mb-2 text-sm font-medium">{t('newGame.players')}</div>
          {allPlayers.length === 0 ? (
            <p className="text-sm text-stone-500">
              {t('newGame.noPlayers')}{' '}
              <Link to="/mangijad" className="underline">
                {t('newGame.addPlayers')}
              </Link>
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {allPlayers.map((p) => {
                const active = selectedIds.includes(p.id)
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePlayer(p.id)}
                    aria-pressed={active}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition ${
                      active ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-300 bg-white hover:border-stone-400'
                    }`}
                  >
                    <PlayerDot color={p.color} />
                    {p.name}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </Card>

      {/* 3. Punktikalkulaator */}
      {selectedPlayers.length > 0 && (
        <>
          <ScoreCalculator game={game} categories={categories} players={selectedPlayers} inputs={inputs} onChange={setInputs} />

          <Card className="mt-6">
            <label className="text-sm font-medium">
              {t('newGame.notes')}
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('newGame.notesPlaceholder')}
                className="mt-1 block w-full rounded-md border border-stone-300 px-2 py-1.5"
              />
            </label>
          </Card>

          <div className="mt-6">
            <ErrorBox>{error}</ErrorBox>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="w-full rounded-md bg-stone-900 px-6 py-2.5 font-semibold text-white hover:bg-stone-700 disabled:opacity-60 sm:w-auto"
              >
                {saving ? t('newGame.saving') : existing ? t('editGame.save') : t('newGame.save', { game: game.name })}
              </button>
              {existing && (
                <Link to="/ajalugu" className="text-sm text-stone-500 hover:text-stone-900">
                  {t('players.cancel')}
                </Link>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
