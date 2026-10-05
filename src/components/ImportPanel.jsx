import { useMemo, useState } from 'react'
import { useI18n } from '../i18n/I18nProvider'
import { WINGSPAN_HISTORY, importGames } from '../lib/api'
import { parseLegacyWingspan } from '../lib/legacyImport'
import { formatDate } from '../lib/scoring'
import { Card, ErrorBox } from './ui'

// Varasemate Wingspani mängude lisamine: kaasas olev ajalugu või kleebitud vana tabel
export default function ImportPanel({ onImported, onClose }) {
  const { t, locale } = useI18n()
  const [text, setText] = useState('')
  const [progress, setProgress] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const parsed = useMemo(() => {
    if (!text.trim()) return null
    try {
      return parseLegacyWingspan(text)
    } catch (e) {
      return { error: e.message }
    }
  }, [text])

  const pasted = parsed?.games ?? []
  const playerNames = [...new Set(pasted.flatMap((g) => g.scores.map((s) => s.name)))]
  const busy = progress !== null

  async function run(games) {
    setError(null)
    setResult(null)
    setProgress({ done: 0, total: games.length })
    try {
      setResult(await importGames('wingspan', games, (done) => setProgress({ done, total: games.length })))
      setText('')
      onImported()
    } catch (e) {
      setError(e.message)
    } finally {
      setProgress(null)
    }
  }

  const first = WINGSPAN_HISTORY[0].date
  const last = WINGSPAN_HISTORY.at(-1).date

  return (
    <Card className="mb-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <h2 className="font-semibold">{t('import.title')}</h2>
        <button type="button" onClick={onClose} className="text-sm text-stone-500 hover:text-stone-900">
          {t('import.close')}
        </button>
      </div>

      {result && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {t('import.done', result)}
        </div>
      )}
      <ErrorBox>{error || parsed?.error}</ErrorBox>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">{t('import.historyTitle')}</h3>
        <p className="text-sm text-stone-600">
          {t('import.historyHelp', {
            n: WINGSPAN_HISTORY.length,
            from: formatDate(first, locale),
            to: formatDate(last, locale),
          })}
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() => run(WINGSPAN_HISTORY)}
          className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
        >
          {busy ? t('import.importing', progress) : t('import.historyButton', { n: WINGSPAN_HISTORY.length })}
        </button>
      </section>

      <section className="space-y-2 border-t border-stone-100 pt-5">
        <h3 className="text-sm font-semibold">{t('import.pasteTitle')}</h3>
        <p className="text-sm text-stone-600">{t('import.help')}</p>
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setResult(null)
          }}
          rows={5}
          placeholder={t('import.placeholder')}
          className="block w-full rounded-md border border-stone-300 px-3 py-2 font-mono text-xs"
        />

        {parsed?.games && (
          <div className="space-y-3 text-sm">
            <p>
              {t('import.summary', { rows: parsed.stats.rows, games: pasted.length, players: playerNames.length })}{' '}
              <span className="text-stone-500">{playerNames.join(', ')}</span>
            </p>
            {parsed.stats.duplicates > 0 && <p className="text-stone-500">{t('import.duplicates', { n: parsed.stats.duplicates })}</p>}
            {parsed.stats.empty > 0 && <p className="text-stone-500">{t('import.empty', { n: parsed.stats.empty })}</p>}
            {parsed.warnings.length > 0 && (
              <ul className="list-disc space-y-0.5 pl-5 text-amber-700">
                {parsed.warnings.map((w, i) => (
                  <li key={i}>{t(w.key, w.vars)}</li>
                ))}
              </ul>
            )}
            <div className="max-h-64 overflow-auto rounded-md border border-stone-100">
              <table className="w-full text-xs">
                <tbody>
                  {pasted.map((g, i) => (
                    <tr key={i} className="border-t border-stone-100 first:border-t-0">
                      <td className="whitespace-nowrap px-2 py-1 tabular-nums">{formatDate(g.date, locale)}</td>
                      <td className="px-2 py-1">{g.scores.map((s) => `${s.name} ${s.total}`).join(' · ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              type="button"
              disabled={busy || pasted.length === 0}
              onClick={() => run(pasted)}
              className="rounded-md bg-stone-900 px-4 py-2 font-medium text-white hover:bg-stone-700 disabled:opacity-50"
            >
              {busy ? t('import.importing', progress) : t('import.button', { n: pasted.length })}
            </button>
          </div>
        )}
      </section>
    </Card>
  )
}
