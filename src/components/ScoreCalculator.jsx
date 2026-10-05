import { useRef } from 'react'
import { useI18n } from '../i18n/I18nProvider'
import { categoryPoints, computeBreakdown, placements, sumBreakdown } from '../lib/scoring'
import { PlayerDot } from './ui'

const inputClass =
  'w-full min-w-14 rounded-md border border-stone-300 bg-white px-2 py-1.5 text-right tabular-nums focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-300'

// Ainult numbrid: tekstiväli numbriklaviatuuriga, muud märgid eemaldatakse
const numberProps = { type: 'text', inputMode: 'numeric', pattern: '[0-9]*', autoComplete: 'off' }
const digitsOnly = (value) => value.replace(/\D/g, '')

// Tabel: read = punktikategooriad, veerud = mängijad.
// Leht kerib üles-alla tavapäraselt; tabel kerib külgsuunas oma kastis.
// Mängijate päis on eraldi tabel, mis jääb lehe ülaserva kinni ja kerib külgsuunas tabeliga kaasa.
// Mõlemal tabelil on samad fikseeritud veerulaiused, et veerud ühtiksid.
// inputs kuju: { [playerId]: { [categoryKey]: "12" | { coins: "3", items: "9" } } }
export default function ScoreCalculator({ game, categories, players, inputs, onChange }) {
  const { t, tr } = useI18n()
  const totals = players.map((p) => sumBreakdown(computeBreakdown(categories, inputs[p.id])))
  const places = placements(totals)
  const hasScores = totals.some((t) => t > 0)

  const headRef = useRef(null)
  const syncHeader = (e) => {
    if (headRef.current) headRef.current.scrollLeft = e.currentTarget.scrollLeft
  }
  const playerWidth = categories.some((c) => c.kind === 'coinsItems') ? '8rem' : '6rem'
  const tableStyle = { minWidth: `calc(var(--cat-w) + ${players.length} * ${playerWidth})` }
  const cols = (
    <colgroup>
      <col style={{ width: 'var(--cat-w)' }} />
      {players.map((p) => (
        <col key={p.id} style={{ width: playerWidth }} />
      ))}
    </colgroup>
  )

  function setValue(playerId, categoryKey, value) {
    onChange({ ...inputs, [playerId]: { ...inputs[playerId], [categoryKey]: value } })
  }

  return (
    <div className="rounded-lg border border-stone-200 bg-white [--cat-w:10rem] sm:[--cat-w:15rem]">
      <div ref={headRef} className={`sticky top-0 z-20 overflow-hidden rounded-t-lg border-b border-stone-200 ${game.theme.soft}`}>
        <table className="w-full table-fixed border-collapse text-sm" style={tableStyle}>
          {cols}
          <thead>
            <tr>
              <th className={`sticky left-0 z-10 px-3 py-2 text-left font-semibold ${game.theme.soft}`}>{t('calc.category')}</th>
              {players.map((p) => (
                <th key={p.id} className="px-2 py-2 text-center font-semibold">
                  <span className="inline-flex max-w-full items-center gap-1.5">
                    <PlayerDot color={p.color} />
                    <span className="truncate" title={p.name}>{p.name}</span>
                  </span>
                </th>
              ))}
            </tr>
          </thead>
        </table>
      </div>
      <div className="overflow-x-auto" onScroll={syncHeader}>
        <table className="w-full table-fixed border-collapse text-sm" style={tableStyle}>
          {cols}
          <tbody>
            {categories.map((c) => (
              <tr key={c.key} className="border-t border-stone-100">
                <th className="sticky left-0 z-10 bg-white px-3 py-2 text-left font-medium">
                  {tr(c.label)}
                  <div className="text-xs font-normal text-stone-400">{tr(c.hint)}</div>
                </th>
                {players.map((p) => {
                  const value = inputs[p.id]?.[c.key]
                  return (
                    <td key={p.id} className="px-2 py-2 align-top">
                      {c.kind === 'coinsItems' ? (
                        <div className="space-y-1">
                          <label className="flex items-center gap-1 text-xs text-stone-500">
                            <span className="w-12">{t('calc.coins')}</span>
                            <input
                              {...numberProps}
                              className={inputClass}
                              value={value?.coins ?? ''}
                              onChange={(e) => setValue(p.id, c.key, { ...value, coins: digitsOnly(e.target.value) })}
                            />
                          </label>
                          <label className="flex items-center gap-1 text-xs text-stone-500">
                            <span className="w-12">{t('calc.items')}</span>
                            <input
                              {...numberProps}
                              className={inputClass}
                              value={value?.items ?? ''}
                              onChange={(e) => setValue(p.id, c.key, { ...value, items: digitsOnly(e.target.value) })}
                            />
                          </label>
                          <div className="text-right text-xs font-semibold text-stone-600">= {categoryPoints(c, value)} p</div>
                        </div>
                      ) : (
                        <input
                          {...numberProps}
                          placeholder="0"
                          className={inputClass}
                          value={value ?? ''}
                          onChange={(e) => setValue(p.id, c.key, digitsOnly(e.target.value))}
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
              <th className="sticky left-0 z-10 bg-inherit px-3 py-3 text-left text-base font-bold">{t('calc.total')}</th>
              {players.map((p, i) => (
                <td key={p.id} className="px-2 py-3 text-center">
                  <div className="text-xl font-bold tabular-nums">{totals[i]}</div>
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
    </div>
  )
}
