import { NavLink, Outlet } from 'react-router'
import { LanguageSwitcher, useI18n } from '../i18n/I18nProvider'

const links = [
  { to: '/uus-mang', label: 'nav.newGame', icon: '➕' },
  { to: '/ajalugu', label: 'nav.history', icon: '📜' },
  { to: '/statistika', label: 'nav.stats', icon: '📊' },
  { to: '/mangijad', label: 'nav.players', icon: '👥' },
]

export default function Layout() {
  const { t } = useI18n()

  return (
    <div className="min-h-screen pb-20 sm:pb-0">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <div className="text-lg font-bold tracking-tight">
            <span aria-hidden>🐦🐉</span> {t('app.name')}
          </div>
          <div className="flex items-center gap-3">
            <nav className="hidden gap-1 sm:flex">
              {links.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  className={({ isActive }) =>
                    `rounded-lg px-3 py-2 text-sm font-medium ${isActive ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'}`
                  }
                >
                  {t(l.label)}
                </NavLink>
              ))}
            </nav>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>

      {/* Mobiilne alumine navigatsioon */}
      <nav className="fixed inset-x-0 bottom-0 grid grid-cols-4 border-t border-stone-200 bg-white sm:hidden">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              `flex flex-col items-center py-2 text-xs ${isActive ? 'font-semibold text-stone-900' : 'text-stone-500'}`
            }
          >
            <span className="text-lg" aria-hidden>{l.icon}</span>
            {t(l.label)}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
