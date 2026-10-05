import { useState } from 'react'
import ImportPanel from '../components/ImportPanel'
import { Card, ErrorBox, GameBadge, GameTabs, Loading, PageTitle, PlayerDot, useLoader } from '../components/ui'
import { useI18n } from '../i18n/I18nProvider'
import { deleteGame, fetchGames } from '../lib/api'
import { GAMES, formatDate } from '../lib/scoring'

export default function HistoryPage() {
  const { t } = useI18n()
  const [filter, setFilter] = useState(null)
  const [importing, setImporting] = useState(false)
  const { data: games, error, loading, reload } = useLoader(() => fetchGames(filter), [filter])

  return (
    <div>
      <PageTitle subtitle={t('history.subtitle')}>{t('history.title')}</PageTitle>
      {importing ? (
        <ImportPanel onImported={reload} onClose={() => setImporting(false)} />
      ) : (
        <button type="button" onClick={() => setImporting(true)} className="mb-4 text-sm text-stone-500 hover:text-stone-900 hover:underline">
          📥 {t('import.open')}
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
        <div className="space-y-3">
          {games?.map((g) => <GameCard key={g.id} game={g} onDeleted={reload} />)}
        </div>
      )}
    </div>
  )
}

function GameCard({ game, onDeleted }) {
  const { t, tr, locale } = useI18n()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState(null)
  const def = GAMES[game.game_type]
  const scores = [...game.game_scores].sort((a, b) => a.placement - b.placement)
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
    <Card>
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 text-left">
        <div className="flex items-center gap-2">
          <GameBadge gameType={game.game_type} />
          <span className="text-sm text-stone-500">{formatDate(game.played_at, locale)}</span>
        </div>
        <div className="flex flex-1 flex-wrap gap-x-4 gap-y-1">
          {scores.map((s) => (
            <span key={s.id} className={`inline-flex items-center gap-1.5 text-sm ${s.placement === 1 ? 'font-bold' : 'text-stone-600'}`}>
              {s.placement === 1 && '🏆'}
              <PlayerDot color={s.player.color} />
              {s.player.name}
              <span className="tabular-nums">{s.total}</span>
            </span>
          ))}
        </div>
        <span className="text-stone-400">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="mt-4 border-t border-stone-100 pt-4">
          {expansions.length > 0 && (
            <p className="mb-3 text-xs text-stone-500">
              {t('history.expansions')}: {expansions.map(tr).join(', ')}
            </p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-stone-500">
                  <th className="py-1 pr-3 text-left font-medium">{t('calc.category')}</th>
                  {scores.map((s) => (
                    <th key={s.id} className="px-2 py-1 text-right font-medium">{s.player.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c.key} className="border-t border-stone-100">
                    <td className="py-1 pr-3">{tr(c.label)}</td>
                    {scores.map((s) => (
                      <td key={s.id} className="px-2 py-1 text-right tabular-nums">{s.breakdown[c.key] ?? 0}</td>
                    ))}
                  </tr>
                ))}
                <tr className="border-t-2 border-stone-300 font-bold">
                  <td className="py-1 pr-3">{t('calc.total')}</td>
                  {scores.map((s) => (
                    <td key={s.id} className="px-2 py-1 text-right tabular-nums">{s.total}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          {game.notes && <p className="mt-3 text-sm italic text-stone-500">{game.notes}</p>}
          <ErrorBox>{error}</ErrorBox>
          <div className="mt-3 text-right">
            <button type="button" onClick={handleDelete} className="text-sm text-red-600 hover:underline">
              {t('history.delete')}
            </button>
          </div>
        </div>
      )}
    </Card>
  )
}
