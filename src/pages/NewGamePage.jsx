import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import ScoreCalculator from '../components/ScoreCalculator'
import { Card, ErrorBox, Loading, PageTitle, PlayerDot, useLoader } from '../components/ui'
import { useI18n } from '../i18n/I18nProvider'
import { createGame, fetchPlayers } from '../lib/api'
import { GAMES, GAME_LIST, computeBreakdown, visibleCategories } from '../lib/scoring'

const today = () => new Date().toLocaleDateString('sv-SE') // YYYY-MM-DD kohalikus ajas

export default function NewGamePage() {
  const navigate = useNavigate()
  const { t, tr } = useI18n()
  const { data: allPlayers, error: loadError, loading } = useLoader(fetchPlayers)

  const [gameType, setGameType] = useState('wingspan')
  const [expansions, setExpansions] = useState([])
  const [playedAt, setPlayedAt] = useState(today)
  const [selectedIds, setSelectedIds] = useState([])
  const [inputs, setInputs] = useState({})
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const game = GAMES[gameType]
  const categories = visibleCategories(gameType, expansions)
  const selectedPlayers = selectedIds.map((id) => allPlayers?.find((p) => p.id === id)).filter(Boolean)

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
    try {
      await createGame({
        gameType,
        playedAt,
        expansions,
        notes,
        scores: selectedPlayers.map((p) => ({ player_id: p.id, breakdown: computeBreakdown(categories, inputs[p.id]) })),
      })
      navigate('/ajalugu')
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  if (loading) return <Loading />

  return (
    <div>
      <PageTitle subtitle={t('newGame.subtitle')}>{t('newGame.title')}</PageTitle>
      <ErrorBox>{loadError}</ErrorBox>

      {/* 1. Mängu valik */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        {GAME_LIST.map((g) => (
          <button
            key={g.key}
            type="button"
            onClick={() => switchGame(g.key)}
            className={`rounded-xl border bg-white p-4 text-left shadow-sm transition ${
              gameType === g.key ? `ring-2 ${g.theme.ring} border-transparent` : 'border-stone-200 hover:border-stone-300'
            }`}
          >
            <div className="text-3xl">{g.icon}</div>
            <div className="mt-1 font-bold">{g.name}</div>
            <div className="text-xs text-stone-500">{tr(g.tagline)}</div>
          </button>
        ))}
      </div>

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
          {allPlayers?.length === 0 ? (
            <p className="text-sm text-stone-500">
              {t('newGame.noPlayers')}{' '}
              <Link to="/mangijad" className="underline">
                {t('newGame.addPlayers')}
              </Link>
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {allPlayers?.map((p) => {
                const active = selectedIds.includes(p.id)
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePlayer(p.id)}
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
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className={`w-full rounded-xl px-6 py-3 font-semibold text-white shadow-sm disabled:opacity-60 sm:w-auto ${game.theme.button}`}
            >
              {saving ? t('newGame.saving') : t('newGame.save', { game: game.name })}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
