import { useI18n } from '../i18n/I18nProvider'
import { categoryPoints, computeBreakdown, placements, sumBreakdown } from '../lib/scoring'
import { PlayerDot } from './ui'

const inputClass =
  'w-full min-w-0 rounded-md border border-stone-300 bg-white px-1.5 py-1.5 text-right text-base tabular-nums sm:min-w-14 sm:px-2 sm:text-sm focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-300'

// Tabel: read = punktikategooriad, veerud = mängijad.
// inputs kuju: { [playerId]: { [categoryKey]: "12" | { coins: "3", items: "9" } } }
export default function ScoreCalculator({ game, categories, players, inputs, onChange }) {
  const { t, tr } = useI18n()
  const totals = players.map((p) => sumBreakdown(computeBreakdown(categories, inputs[p.id])))
  const places = placements(totals)
  const hasScores = totals.some((t) => t > 0)

  function setValue(playerId, categoryKey, value) {
    onChange({ ...inputs, [playerId]: { ...inputs[playerId], [categoryKey]: value } })
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className={game.theme.soft}>
            <th className="sticky left-0 z-10 bg-inherit px-2 py-2 text-left font-semibold sm:px-3">{t('calc.category')}</th>
            {players.map((p) => (
              <th key={p.id} className="px-1 py-2 text-center text-xs font-semibold sm:px-2 sm:text-sm">
                <span className="inline-flex max-w-16 flex-col items-center gap-0.5 sm:max-w-none sm:flex-row sm:gap-1.5">
                  <PlayerDot color={p.color} />
                  <span className="max-w-full truncate" title={p.name}>{p.name}</span>
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {categories.map((c) => (
            <tr key={c.key} className="border-t border-stone-100">
              <th className="sticky left-0 z-10 w-24 bg-white px-2 py-2 text-left text-xs font-medium sm:w-auto sm:px-3 sm:text-sm">
                {tr(c.label)}
                <div className="hidden max-w-52 text-xs font-normal text-stone-400 sm:block">{tr(c.hint)}</div>
              </th>
              {players.map((p) => {
                const value = inputs[p.id]?.[c.key]
                return (
                  <td key={p.id} className="px-1 py-2 align-top sm:px-2">
                    {c.kind === 'coinsItems' ? (
                      <div className="space-y-1">
                        <label className="flex flex-col gap-0.5 text-xs text-stone-500 sm:flex-row sm:items-center sm:gap-1">
                          <span className="sm:w-12">{t('calc.coins')}</span>
                          <input
                            type="number"
                            inputMode="numeric"
                            min="0"
                            className={inputClass}
                            value={value?.coins ?? ''}
                            onChange={(e) => setValue(p.id, c.key, { ...value, coins: e.target.value })}
                          />
                        </label>
                        <label className="flex flex-col gap-0.5 text-xs text-stone-500 sm:flex-row sm:items-center sm:gap-1">
                          <span className="sm:w-12">{t('calc.items')}</span>
                          <input
                            type="number"
                            inputMode="numeric"
                            min="0"
                            className={inputClass}
                            value={value?.items ?? ''}
                            onChange={(e) => setValue(p.id, c.key, { ...value, items: e.target.value })}
                          />
                        </label>
                        <div className="text-right text-xs font-semibold text-stone-600">= {categoryPoints(c, value)} p</div>
                      </div>
                    ) : (
                      <input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        placeholder="0"
                        className={inputClass}
                        value={value ?? ''}
                        onChange={(e) => setValue(p.id, c.key, e.target.value)}
                      />
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className={`border-t-2 border-stone-300 ${game.theme.soft}`}>
            <th className="sticky left-0 z-10 bg-inherit px-2 py-3 text-left text-sm font-bold sm:px-3 sm:text-base">{t('calc.total')}</th>
            {players.map((p, i) => (
              <td key={p.id} className="px-1 py-3 text-center sm:px-2">
                <div className="text-lg font-bold tabular-nums sm:text-xl">{totals[i]}</div>
                {hasScores && players.length > 1 && (
                  <div className={`text-xs font-semibold ${places[i] === 1 ? game.theme.text : 'text-stone-400'}`}>
                    {t('calc.place', { n: places[i] })}
                  </div>
                )}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
