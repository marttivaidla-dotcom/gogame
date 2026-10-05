import { useState } from 'react'
import { Card, ErrorBox, GameTabs, Loading, PageTitle, PlayerDot, useLoader } from '../components/ui'
import { useI18n } from '../i18n/I18nProvider'
import { fetchGames, fetchPlayerStats } from '../lib/api'
import { GAMES, formatDate } from '../lib/scoring'

export default function StatsPage() {
  const { t } = useI18n()
  const [gameType, setGameType] = useState('wingspan')
  const { data, error, loading } = useLoader(
    async () => {
      const [stats, games, allGames] = await Promise.all([fetchPlayerStats(gameType), fetchGames(gameType), fetchGames()])
      return { stats, games, allGames }
    },
    [gameType],
  )

  return (
    <div>
      <PageTitle subtitle={t('stats.subtitle')}>{t('stats.title')}</PageTitle>
      <GameTabs value={gameType} onChange={setGameType} />
      <ErrorBox>{error}</ErrorBox>
      {loading ? (
        <Loading />
      ) : (
        data && (
          <>
            <GameCountOverview games={data.allGames} />
            {data.games.length === 0 ? (
              <p className="py-8 text-center text-stone-400">{t('stats.empty', { game: GAMES[gameType].name })}</p>
            ) : (
              <StatsContent gameType={gameType} stats={data.stats} games={data.games} />
            )}
          </>
        )
      )}
    </div>
  )
}

function GameCountOverview({ games }) {
  const { t } = useI18n()
  const wingspan = games.filter((game) => game.game_type === 'wingspan').length
  const wyrmspan = games.filter((game) => game.game_type === 'wyrmspan').length
  return (
    <div className="mb-6 grid grid-cols-3 gap-3">
      <CountCard label={t('stats.wingspanGames')} count={wingspan} />
      <CountCard label={t('stats.wyrmspanGames')} count={wyrmspan} />
      <CountCard label={t('stats.allGames')} count={games.length} />
    </div>
  )
}

function CountCard({ label, count }) {
  return (
    <Card>
      <div className="text-xs text-stone-500 sm:text-sm">{label}</div>
      <div className="text-2xl font-bold tabular-nums sm:text-3xl">{count}</div>
    </Card>
  )
}

function StatsContent({ gameType, stats, games }) {
  const { t, tr, lang, locale } = useI18n()
  const def = GAMES[gameType]
  const allScores = games.flatMap((g) =>
    g.game_scores.map((s) => ({ ...s, played_at: g.played_at, expansions: g.expansions ?? [] })),
  )
  const best = allScores.reduce((a, b) => (b.total > (a?.total ?? -Infinity) ? b : a), null)
  const multiplayer = games.filter((g) => g.game_scores.length > 1)
  const avgWinning = multiplayer.length
    ? Math.round(multiplayer.reduce((sum, g) => sum + Math.max(...g.game_scores.map((s) => s.total)), 0) / multiplayer.length)
    : '–'

  const leaderboard = [...stats].sort((a, b) => b.wins - a.wins || b.avg_score - a.avg_score)
  const maxAvg = Math.max(...leaderboard.map((s) => Number(s.avg_score)), 1)

  // Keskmised punktid kategooriate kaupa iga mängija kohta
  const categories = def.categories.filter((c) => !c.expansion || allScores.some((s) => Object.hasOwn(s.breakdown, c.key)))
  const byPlayer = Object.values(
    allScores.reduce((acc, s) => {
      const entry = (acc[s.player.id] ??= { player: s.player, rows: [] })
      entry.rows.push({ breakdown: s.breakdown, expansions: s.expansions })
      return acc
    }, {}),
  ).sort((a, b) => a.player.name.localeCompare(b.player.name, lang))
  const avg = (rows, key) => rows.length
    ? (rows.reduce((sum, r) => sum + (Number(r[key]) || 0), 0) / rows.length).toFixed(1)
    : null

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <div className="text-sm text-stone-500">{t('stats.totalGames')}</div>
          <div className="text-3xl font-bold">{games.length}</div>
        </Card>
        <Card>
          <div className="text-sm text-stone-500">{t('stats.avgWinning')}</div>
          <div className="text-3xl font-bold">{avgWinning}</div>
        </Card>
        <Card>
          <div className="text-sm text-stone-500">{t('stats.record')}</div>
          <div className="text-3xl font-bold">{best?.total}</div>
          {best && (
            <div className="mt-1 text-xs text-stone-500">
              {best.player.name} · {formatDate(best.played_at, locale)}
            </div>
          )}
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 font-semibold">{t('stats.leaderboard')}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-stone-500">
                <th className="py-2 pr-3 font-medium">{t('stats.player')}</th>
                <th className="px-2 py-2 text-right font-medium">{t('stats.games')}</th>
                <th className="px-2 py-2 text-right font-medium">{t('stats.wins')}</th>
                <th className="px-2 py-2 text-right font-medium">{t('stats.winPct')}</th>
                <th className="px-2 py-2 text-right font-medium">{t('stats.best')}</th>
                <th className="w-1/3 px-2 py-2 font-medium">{t('stats.average')}</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((s) => (
                <tr key={s.player_id} className="border-t border-stone-100">
                  <td className="py-2 pr-3">
                    <span className="inline-flex items-center gap-2 font-medium">
                      <PlayerDot color={s.color} /> {s.name}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">{s.games_played}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{s.wins}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{Math.round((s.wins / s.games_played) * 100)}%</td>
                  <td className="px-2 py-2 text-right tabular-nums">{s.best_score}</td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 rounded-full bg-stone-100">
                        <div
                          className="h-2 rounded-full"
                          style={{ width: `${(Number(s.avg_score) / maxAvg) * 100}%`, backgroundColor: s.color }}
                        />
                      </div>
                      <span className="w-12 text-right tabular-nums">{s.avg_score}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">{t('stats.categoryAverages')}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-stone-500">
                <th className="py-2 pr-3 text-left font-medium">{t('calc.category')}</th>
                {byPlayer.map(({ player }) => (
                  <th key={player.id} className="px-2 py-2 text-right font-medium">{player.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => {
                const values = byPlayer.map(({ rows }) => {
                  const applicableRows = rows.filter(
                    (row) =>
                      !c.expansion ||
                      row.expansions.includes(c.expansion) ||
                      Object.hasOwn(row.breakdown, c.key),
                  )
                  const value = avg(applicableRows.map((row) => row.breakdown), c.key)
                  return value === null ? null : Number(value)
                })
                const top = Math.max(...values.filter((value) => value !== null), 0)
                return (
                  <tr key={c.key} className="border-t border-stone-100">
                    <td className="py-2 pr-3">{tr(c.label)}</td>
                    {values.map((v, i) => (
                      <td
                        key={byPlayer[i].player.id}
                        className={`px-2 py-2 text-right tabular-nums ${v !== null && v === top && byPlayer.length > 1 && v > 0 ? `font-bold ${def.theme.text}` : ''}`}
                      >
                        {v === null ? '–' : v.toFixed(1)}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-stone-400">{t('stats.bestNote')}</p>
      </Card>
    </div>
  )
}
