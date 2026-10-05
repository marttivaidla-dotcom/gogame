import { useCallback, useEffect, useState } from 'react'
import { useI18n } from '../i18n/I18nProvider'
import { GAMES, GAME_LIST } from '../lib/scoring'

// Laeb andmed asünkroonselt ja annab tagasi { data, error, loading, reload }
export function useLoader(loader, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true })

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(loader, deps)

  const reload = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      setState({ data: await load(), error: null, loading: false })
    } catch (e) {
      setState({ data: null, error: e.message, loading: false })
    }
  }, [load])

  useEffect(() => {
    reload()
  }, [reload])

  return { ...state, reload }
}

export function PageTitle({ children, subtitle }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold tracking-tight">{children}</h1>
      {subtitle && <p className="mt-1 text-stone-500">{subtitle}</p>}
    </div>
  )
}

export function Card({ className = '', children }) {
  return <div className={`rounded-xl border border-stone-200 bg-white p-4 shadow-sm ${className}`}>{children}</div>
}

// children võib olla tõlkevõti (nt 'errors.duplicateName') või valmis tekst
export function ErrorBox({ children }) {
  const { t } = useI18n()
  if (!children) return null
  return (
    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {typeof children === 'string' ? t(children) : children}
    </div>
  )
}

export function Loading() {
  const { t } = useI18n()
  return <p className="py-8 text-center text-stone-400">{t('common.loading')}</p>
}

export function GameBadge({ gameType }) {
  const g = GAMES[gameType]
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${g.theme.badge}`}>
      {g.icon} {g.name}
    </span>
  )
}

export function PlayerDot({ color }) {
  return <span className="inline-block h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
}

// Wingspan / Wyrmspan valik (valikuliselt ka "Kõik")
export function GameTabs({ value, onChange, includeAll = false }) {
  const { t } = useI18n()
  const options = [...(includeAll ? [{ key: null, name: t('common.all'), icon: '🎲' }] : []), ...GAME_LIST]
  return (
    <div className="mb-6 inline-flex rounded-xl bg-stone-200/60 p-1">
      {options.map((o) => (
        <button
          key={o.key ?? 'all'}
          type="button"
          onClick={() => onChange(o.key)}
          className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
            value === o.key ? 'bg-white shadow-sm' : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          {o.icon} {o.name}
        </button>
      ))}
    </div>
  )
}
