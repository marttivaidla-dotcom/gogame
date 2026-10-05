import { useState } from 'react'
import { Link } from 'react-router'
import ImportPanel from '../components/ImportPanel'
import { Card, ErrorBox, GameBadge, GameTabs, Loading, PageTitle, PlayerDot, PlaceBadge, useLoader } from '../components/ui'
import { useI18n } from '../i18n/I18nProvider'
import { deleteGame, fetchGames } from '../lib/api'
import { GAMES, formatDate } from '../lib/scoring'

export default function HistoryPage() {
  const { t, locale } = useI18n()
  const [filter, setFilter] = useState(null)
  const [importing, setImporting] = useState(false)
  const { data: games, error, loading, reload } = useLoader(() => fetchGames(filter), [filter])

  // Mänguõhtud: mängud rühmitatud kuupäeva järgi (uuemad eespool)
  const days = []
  for (const g of games ?? []) {
    if (days.at(-1)?.date !== g.played_at) days.push({ date: g.played_at, games: [] })
    days.at(-1).games.push(g)
  }

  return (
    <div>
      <PageTitle subtitle={t('history.subtitle')}>{t('history.title')}</PageTitle>
      {importing ? (
        <ImportPanel onImported={reload} onClose={() => setImporting(false)} />
      ) : (
        <button type="button" onClick={() => setImporting(true)} className="mb-4 text-sm text-stone-500 underline-offset-2 hover:text-stone-900 hover:underline">
          {t('import.open')}
        </button>
      )}
      <div>
        <GameTabs value={filter} onChange={setFilter} includeAll />
      </div>
      <ErrorBox>{error}</ErrorBox>

      {loading ? (
        <Loading />
      ) : games?.length === 0 ? (
        <p className="py-8 text-center text-stone-400">{t('history.empty')}</p>
      ) : (
        <>
          <p className="mb-4 text-sm text-stone-500">{t('history.count', { games: games.length, days: days.length })}</p>
          <div className="divide-y divide-stone-200">
            {days.map((day) => (
              <section key={day.date} className="grid gap-3 py-5 first:pt-0 sm:grid-cols-[9rem_1fr]">
                <div>
                  <h2 className="font-semibold">{formatDate(day.date, locale)}</h2>
                  <p className="text-sm text-stone-500">{t('history.gamesOnDay', { n: day.games.length })}</p>
                </div>
                <div className="space-y-2">
                  {day.games.map((g) => (
                    <GameCard key={g.id} game={g} onDeleted={reload} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function GameCard({ game, onDeleted }) {
  const { t, tr } = useI18n()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState(null)
  const def = GAMES[game.game_type]
  const scores = [...game.game_scores].sort((a, b) => a.placement - b.placement)
  const totals = scores.map((s) => s.total)
  const margin = totals.length > 1 ? totals[0] - totals[1] : null
  const expansions = (game.expansions ?? [])
    .map((key) => def.expansions.find((expansion) => expansion.key === key)?.label)
    .filter(Boolean)

  // Näita kõiki definitsiooni kategooriaid + vanu/tundmatuid võtmeid, mis andmetes leiduvad
  const usedKeys = new Set(scores.flatMap((s) => Object.keys(s.breakdown)))
  const categories = [
    ...def.categories.filter((c) => !c.expansion || scores.some((s) => s.breakdown[c.key])),
    ...[...usedKeys].filter((k) => !def.categories.some((c) => c.key === k)).map((k) => ({ key: k, label: k })),
  ]

  async function handleDelete() {
    if (!confirm(t('history.deleteConfirm'))) return
    try {
      await deleteGame(game.id)
      onDeleted()
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <Card className="p-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-left"
      >
        <GameBadge gameType={game.game_type} />
        <div className="flex flex-1 flex-wrap gap-x-4 gap-y-1">
          {scores.map((s) => (
            <span key={s.id} className={`inline-flex items-center gap-1.5 text-sm ${s.placement === 1 ? 'font-semibold' : 'text-stone-600'}`}>
              <PlaceBadge place={s.placement} />
              <PlayerDot color={s.player.color} />
              {s.player.name}
              <span className="tabular-nums">{s.total}</span>
            </span>
          ))}
        </div>
        {margin !== null && (
          <span className="text-xs text-stone-500">{margin === 0 ? t('history.tie') : t('history.margin', { n: margin })}</span>
        )}
        <span className="text-stone-400" aria-hidden>{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div className="border-t border-stone-100 px-4 pb-4 pt-3">
          {expansions.length > 0 && (
            <p className="mb-3 text-xs text-stone-500">
              {t('history.expansions')}: {expansions.map(tr).join(', ')}
            </p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="text-stone-500">
                  <th className="sticky left-0 bg-white py-1 pr-2 text-left font-medium sm:pr-3">{t('calc.category')}</th>
                  {scores.map((s) => (
                    <th key={s.id} className="max-w-16 truncate px-1 py-1 text-right font-medium sm:max-w-none sm:px-2" title={s.player.name}>{s.player.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c.key} className="border-t border-stone-100">
                    <td className="sticky left-0 bg-white py-1 pr-2 sm:pr-3">{tr(c.label)}</td>
                    {scores.map((s) => (
                      <td key={s.id} className="px-1 py-1 text-right tabular-nums sm:px-2">{s.breakdown[c.key] ?? 0}</td>
                    ))}
                  </tr>
                ))}
                <tr className="border-t-2 border-stone-300 font-bold">
                  <td className="sticky left-0 bg-white py-1 pr-2 sm:pr-3">{t('calc.total')}</td>
                  {scores.map((s) => (
                    <td key={s.id} className="px-1 py-1 text-right tabular-nums sm:px-2">{s.total}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          {game.notes && <p className="mt-3 text-sm italic text-stone-500">{game.notes}</p>}
          <ErrorBox>{error}</ErrorBox>
          <div className="mt-3 flex justify-end gap-4 text-sm">
            <button type="button" onClick={handleDelete} className="text-red-600 hover:underline">
              {t('history.delete')}
            </button>
            <Link to={`/mang/${game.id}/muuda`} className="font-medium text-stone-900 hover:underline">
              {t('history.edit')}
            </Link>
          </div>
        </div>
      )}
    </Card>
  )
}
