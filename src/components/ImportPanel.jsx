import { useMemo, useState } from 'react'
import { useI18n } from '../i18n/I18nProvider'
import { importGames } from '../lib/api'
import { parseLegacyWingspan } from '../lib/legacyImport'
import { formatDate, GAMES } from '../lib/scoring'
import { Card, ErrorBox } from './ui'

// Vana Wingspani tabeli kleepimine → eelvaade → import
export default function ImportPanel({ onImported, onClose }) {
  const { t, locale } = useI18n()
  const [text, setText] = useState('')
  const [skipRepeats, setSkipRepeats] = useState(false)
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

  const games = parsed?.games?.filter((g) => !skipRepeats || !g.repeat) ?? []
  const playerNames = [...new Set(games.flatMap((g) => g.scores.map((s) => s.name)))]

  async function handleImport() {
    setError(null)
    setProgress(0)
    try {
      setResult(await importGames('wingspan', games, setProgress))
      setText('')
      onImported()
    } catch (e) {
      setError(e.message)
    } finally {
      setProgress(null)
    }
  }

  return (
    <Card className="mb-6">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold">
            {GAMES.wingspan.icon} {t('import.title')}
          </h2>
          <p className="mt-1 text-sm text-stone-500">{t('import.help')}</p>
        </div>
        <button type="button" onClick={onClose} className="text-sm text-stone-500 hover:text-stone-900">
          {t('players.cancel')}
        </button>
      </div>

      {result && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {t('import.done', result)}
        </div>
      )}
      <ErrorBox>{error || parsed?.error}</ErrorBox>

      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setResult(null)
        }}
        rows={6}
        placeholder={t('import.placeholder')}
        className="block w-full rounded-md border border-stone-300 px-3 py-2 font-mono text-xs"
      />

      {parsed?.games && (
        <div className="mt-4 space-y-3 text-sm">
          <p>
            {t('import.summary', { rows: parsed.stats.rows, games: games.length, players: playerNames.length })}{' '}
            <span className="text-stone-500">{playerNames.join(', ')}</span>
          </p>
          {parsed.stats.empty > 0 && <p className="text-stone-500">{t('import.empty', { n: parsed.stats.empty })}</p>}
          {parsed.stats.repeats > 0 && (
            <label className="flex items-start gap-2">
              <input type="checkbox" checked={skipRepeats} onChange={(e) => setSkipRepeats(e.target.checked)} className="mt-0.5" />
              <span>{t('import.skipRepeats', { n: parsed.stats.repeats })}</span>
            </label>
          )}
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
                {games.map((g, i) => (
                  <tr key={i} className={`border-t border-stone-100 ${g.repeat ? 'text-stone-400' : ''}`}>
                    <td className="whitespace-nowrap px-2 py-1 tabular-nums">{formatDate(g.date, locale)}</td>
                    <td className="px-2 py-1">
                      {g.scores.map((s) => `${s.name} ${s.total}`).join(' · ')}
                      {g.repeat && ` (${t('import.repeat')})`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            disabled={progress !== null || games.length === 0}
            onClick={handleImport}
            className={`rounded-md px-4 py-2 font-medium text-white disabled:opacity-50 ${GAMES.wingspan.theme.button}`}
          >
            {progress !== null
              ? t('import.importing', { done: progress, total: games.length })
              : t('import.button', { n: games.length })}
          </button>
        </div>
      )}
    </Card>
  )
}
