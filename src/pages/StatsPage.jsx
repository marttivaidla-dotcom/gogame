import { useState } from 'react'
import TrendChart from '../components/TrendChart'
import { Card, ErrorBox, GameTabs, Loading, PageTitle, PlaceBadge, PlayerDot, useLoader } from '../components/ui'
import { useI18n } from '../i18n/I18nProvider'
import { fetchGames } from '../lib/api'
import { GAMES, formatDate } from '../lib/scoring'
import { headToHead, mostFrequentPair, playerSummaries, records, rollingAverages } from '../lib/stats'

// Alla selle mängude arvu on mängija edetabelis eraldi, sest võidu % on juhuslik
const MIN_GAMES = 5

export default function StatsPage() {
  const { t } = useI18n()
  const [gameType, setGameType] = useState('wingspan')
  const { data: games, error, loading } = useLoader(() => fetchGames(gameType), [gameType])

  return (
    <div>
      <PageTitle subtitle={t('stats.subtitle')}>{t('stats.title')}</PageTitle>
      <GameTabs value={gameType} onChange={setGameType} />
      <ErrorBox>{error}</ErrorBox>
      {loading ? (
        <Loading />
      ) : games?.length === 0 ? (
        <p className="py-8 text-center text-stone-400">{t('stats.empty', { game: GAMES[gameType].name })}</p>
      ) : (
        games && <StatsContent key={gameType} gameType={gameType} games={games} />
      )}
    </div>
  )
}

function StatsContent({ gameType, games }) {
  const { t, locale } = useI18n()
  const def = GAMES[gameType]
  const summaries = playerSummaries(games)
  const rec = records(games, def.categories.filter((c) => !c.expansion))
  const trend = rollingAverages(games)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label={t('stats.totalGames')} value={games.length} />
        <Stat label={t('stats.nights')} value={rec.nights} />
        <Stat label={t('stats.avgWinning')} value={rec.avgWinning == null ? '–' : Math.round(rec.avgWinning)} />
        <Stat
          label={t('stats.record')}
          value={rec.top.total}
          note={`${rec.top.player.name} · ${formatDate(rec.top.date, locale)}`}
        />
      </div>

      <Leaderboard summaries={summaries} />

      <div className="grid gap-6 lg:grid-cols-2">
        <HeadToHead games={games} summaries={summaries} />
        <Records rec={rec} />
      </div>

      {trend.length > 0 && (
        <Card>
          <h2 className="font-semibold">{t('stats.trendTitle')}</h2>
          <p className="mb-4 text-sm text-stone-500">{t('stats.trendHelp')}</p>
          <TrendChart series={trend} />
        </Card>
      )}

      <CategoryAverages def={def} games={games} />
    </div>
  )
}

function Stat({ label, value, note }) {
  return (
    <Card>
      <div className="text-xs text-stone-500 sm:text-sm">{label}</div>
      <div className="text-2xl font-bold tabular-nums sm:text-3xl">{value}</div>
      {note && <div className="mt-1 text-xs text-stone-500">{note}</div>}
    </Card>
  )
}

function Leaderboard({ summaries }) {
  const { t } = useI18n()
  const byWinPct = (a, b) => b.winPct - a.winPct || b.avg - a.avg
  const regular = summaries.filter((s) => s.games >= MIN_GAMES).sort(byWinPct)
  const occasional = summaries.filter((s) => s.games < MIN_GAMES).sort((a, b) => b.games - a.games || byWinPct(a, b))

  const row = (s, muted) => (
    <tr key={s.player.id} className={`border-t border-stone-100 ${muted ? 'text-stone-500' : ''}`}>
      <td className="py-2 pr-3">
        <span className="inline-flex items-center gap-2 font-medium">
          <PlayerDot color={s.player.color} /> {s.player.name}
        </span>
      </td>
      <td className="px-2 py-2 text-right tabular-nums">{s.games}</td>
      <td className="px-2 py-2 text-right tabular-nums">{s.wins}</td>
      <td className="px-2 py-2 text-right tabular-nums">{Math.round(s.winPct * 100)}%</td>
      <td className="px-2 py-2 text-right tabular-nums">{s.avg.toFixed(1)}</td>
      <td className="px-2 py-2 text-right tabular-nums">{s.best}</td>
      <td className="py-2 pl-2">
        <span className="inline-flex gap-1">
          {s.places.slice(-5).map((p, i) => (
            <PlaceBadge key={i} place={p} />
          ))}
        </span>
      </td>
    </tr>
  )

  return (
    <Card>
      <h2 className="font-semibold">{t('stats.leaderboard')}</h2>
      <p className="mb-3 text-sm text-stone-500">{t('stats.leaderboardHelp', { n: MIN_GAMES })}</p>
      <div className="overflow-x-auto">
        <table className="w-full whitespace-nowrap text-sm">
          <thead>
            <tr className="text-left text-stone-500">
              <th className="py-2 pr-3 font-medium">{t('stats.player')}</th>
              <th className="px-2 py-2 text-right font-medium">{t('stats.games')}</th>
              <th className="px-2 py-2 text-right font-medium">{t('stats.wins')}</th>
              <th className="px-2 py-2 text-right font-medium">{t('stats.winPct')}</th>
              <th className="px-2 py-2 text-right font-medium">{t('stats.average')}</th>
              <th className="px-2 py-2 text-right font-medium">{t('stats.best')}</th>
              <th className="py-2 pl-2 font-medium">{t('stats.lastFive')}</th>
            </tr>
          </thead>
          <tbody>
            {regular.map((s) => row(s, false))}
            {occasional.length > 0 && (
              <tr className="border-t border-stone-200">
                <td colSpan={7} className="pb-1 pt-4 text-xs font-medium uppercase tracking-wide text-stone-400">
                  {t('stats.fewGames', { n: MIN_GAMES })}
                </td>
              </tr>
            )}
            {occasional.map((s) => row(s, true))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function HeadToHead({ games, summaries }) {
  const { t } = useI18n()
  const [defaultA, defaultB] = mostFrequentPair(games)
  const [aId, setA] = useState(defaultA)
  const [bId, setB] = useState(defaultB)
  if (!defaultA) return null
  const a = summaries.find((s) => s.player.id === aId)?.player
  const b = summaries.find((s) => s.player.id === bId)?.player
  const h = a && b && aId !== bId ? headToHead(games, aId, bId) : null
  const select = (value, onChange, id) => (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md border border-stone-300 bg-white px-2 py-1.5 text-sm"
    >
      {[...summaries].sort((x, y) => y.games - x.games).map((s) => (
        <option key={s.player.id} value={s.player.id}>{s.player.name}</option>
      ))}
    </select>
  )

  return (
    <Card>
      <h2 className="mb-3 font-semibold">{t('stats.h2hTitle')}</h2>
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        {select(aId, setA, 'h2h-a')}
        <span className="text-stone-400">–</span>
        {select(bId, setB, 'h2h-b')}
      </div>
      {!h || h.games === 0 ? (
        <p className="text-sm text-stone-500">{t('stats.h2hNone')}</p>
      ) : (
        <>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-sm text-stone-500">{a.name}</div>
              <div className="text-4xl font-bold tabular-nums">{h.aWins}</div>
            </div>
            <div className="pb-1 text-center text-sm text-stone-500">
              {t('stats.h2hGames', { n: h.games })}
              <br />
              {t('stats.h2hTies', { n: h.ties })}
            </div>
            <div className="text-right">
              <div className="text-sm text-stone-500">{b.name}</div>
              <div className="text-4xl font-bold tabular-nums">{h.bWins}</div>
            </div>
          </div>
          <div className="mt-3 flex h-2 gap-0.5 overflow-hidden rounded-full">
            <div style={{ flex: h.aWins, backgroundColor: a.color }} />
            {h.ties > 0 && <div className="bg-stone-200" style={{ flex: h.ties }} />}
            <div style={{ flex: h.bWins, backgroundColor: b.color }} />
          </div>
          <p className="mt-3 text-sm text-stone-600">
            {t('stats.h2hDiff', { n: Math.abs(h.avgDiff).toFixed(1), name: h.avgDiff >= 0 ? a.name : b.name })}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-1 text-xs">
            <span className="mr-1 text-stone-500">{t('stats.h2hLast')}</span>
            {h.sequence.slice(-10).map((w, i) => {
              const p = w === 'a' ? a : w === 'b' ? b : null
              return (
                <span
                  key={i}
                  title={p?.name ?? t('history.tie')}
                  className="inline-grid h-6 w-6 place-items-center rounded-full font-semibold text-white"
                  style={{ backgroundColor: p?.color ?? '#d6d3d1' }}
                >
                  {p ? p.name.slice(0, 2) : '='}
                </span>
              )
            })}
          </div>
        </>
      )}
    </Card>
  )
}

function Records({ rec }) {
  const { t, tr, locale } = useI18n()
  const items = [
    ...rec.categories.map(({ category, score }) => ({
      label: t('stats.recordCategory', { category: tr(category.label) }),
      value: Number(score.breakdown[category.key]) || 0,
      who: score.player.name,
      date: score.date,
    })),
    rec.biggestWin && {
      label: t('stats.biggestWin'),
      value: `${rec.biggestWin.margin} p`,
      who: rec.biggestWin.winner?.name,
      date: rec.biggestWin.date,
    },
  ].filter(Boolean)

  return (
    <Card>
      <h2 className="mb-1 font-semibold">{t('stats.records')}</h2>
      <dl className="divide-y divide-stone-100 text-sm">
        {items.map((item) => (
          <div key={item.label} className="flex items-baseline justify-between gap-4 py-2">
            <dt>
              {item.label}
              <span className="block text-xs text-stone-500">
                {item.who} · {formatDate(item.date, locale)}
              </span>
            </dt>
            <dd className="text-lg font-semibold tabular-nums">{item.value}</dd>
          </div>
        ))}
        <div className="flex items-baseline justify-between gap-4 py-2">
          <dt>{t('stats.ties')}</dt>
          <dd className="text-lg font-semibold tabular-nums">{rec.ties}</dd>
        </div>
      </dl>
    </Card>
  )
}

function CategoryAverages({ def, games }) {
  const { t, tr, lang } = useI18n()
  const allScores = games.flatMap((g) =>
    g.game_scores.filter((s) => s.player).map((s) => ({ ...s, expansions: g.expansions ?? [] })),
  )
  const categories = def.categories.filter((c) => !c.expansion || allScores.some((s) => Object.hasOwn(s.breakdown, c.key)))
  const byPlayer = Object.values(
    allScores.reduce((acc, s) => {
      const entry = (acc[s.player.id] ??= { player: s.player, rows: [] })
      entry.rows.push({ breakdown: s.breakdown, expansions: s.expansions })
      return acc
    }, {}),
  )
    .filter((p) => p.rows.length >= MIN_GAMES)
    .sort((a, b) => b.rows.length - a.rows.length || a.player.name.localeCompare(b.player.name, lang))
  const avg = (rows, key) => (rows.length ? rows.reduce((sum, r) => sum + (Number(r[key]) || 0), 0) / rows.length : null)

  if (byPlayer.length === 0) return null

  return (
    <Card>
      <h2 className="font-semibold">{t('stats.categoryAverages')}</h2>
      <p className="mb-3 text-sm text-stone-500">{t('stats.categoryHelp', { n: MIN_GAMES })}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs sm:text-sm">
          <thead>
            <tr className="text-stone-500">
              <th className="sticky left-0 bg-white py-2 pr-2 text-left font-medium sm:pr-3">{t('calc.category')}</th>
              {byPlayer.map(({ player }) => (
                <th key={player.id} className="max-w-16 truncate px-1 py-2 text-right font-medium sm:max-w-none sm:px-2" title={player.name}>{player.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => {
              const values = byPlayer.map(({ rows }) => {
                const applicable = rows.filter((row) => !c.expansion || row.expansions.includes(c.expansion) || Object.hasOwn(row.breakdown, c.key))
                return avg(applicable.map((row) => row.breakdown), c.key)
              })
              const top = Math.max(...values.filter((v) => v !== null), 0)
              return (
                <tr key={c.key} className="border-t border-stone-100">
                  <td className="sticky left-0 bg-white py-2 pr-2 sm:pr-3">{tr(c.label)}</td>
                  {values.map((v, i) => (
                    <td
                      key={byPlayer[i].player.id}
                      className={`px-1 py-2 text-right tabular-nums sm:px-2 ${v !== null && v === top && byPlayer.length > 1 && v > 0 ? 'font-bold text-stone-900' : 'text-stone-600'}`}
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
  )
}
