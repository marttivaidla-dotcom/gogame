import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { LANGUAGES, translations } from './translations'

const STORAGE_KEY = 'lang'
const I18nContext = createContext(null)

function initialLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (translations[saved]) return saved
  } catch {
    // localStorage pole saadaval (nt privaatne aken) – kasuta brauseri keelt
  }
  return navigator.language?.toLowerCase().startsWith('et') ? 'et' : 'en'
}

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(initialLanguage)

  const setLang = useCallback((code) => {
    setLangState(code)
    try {
      localStorage.setItem(STORAGE_KEY, code)
    } catch {
      // ignoreeri
    }
  }, [])

  // t('võti', { muutujad }) – tundmatu võtme korral tagastatakse võti ise
  const t = useCallback(
    (key, vars = {}) => {
      const value = translations[lang][key] ?? translations.et[key]
      if (value === undefined) return key
      if (typeof value === 'function') return value(vars)
      return value.replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? '')
    },
    [lang],
  )

  // Tõlgib objekti kujul { et: '...', en: '...' } (nt mängude kategooriad)
  const tr = useCallback((obj) => (obj && typeof obj === 'object' ? obj[lang] ?? obj.et : obj), [lang])

  const locale = LANGUAGES.find((l) => l.code === lang).locale

  useEffect(() => {
    document.documentElement.lang = lang
    document.title = t('app.docTitle')
  }, [lang, t])

  const value = useMemo(() => ({ lang, setLang, t, tr, locale }), [lang, setLang, t, tr, locale])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  return useContext(I18nContext)
}

export function LanguageSwitcher({ className = '' }) {
  const { lang, setLang, t } = useI18n()
  return (
    <div className={`inline-flex rounded-lg bg-stone-100 p-0.5 text-xs font-semibold ${className}`} role="group" aria-label={t('common.language')}>
      {LANGUAGES.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => setLang(l.code)}
          aria-pressed={lang === l.code}
          className={`rounded-md px-2 py-1 ${lang === l.code ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-900'}`}
        >
          {l.label}
        </button>
      ))}
    </div>
  )
}
