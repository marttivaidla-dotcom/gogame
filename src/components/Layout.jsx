import { NavLink, Outlet } from 'react-router'
import { LanguageSwitcher, useI18n } from '../i18n/I18nProvider'

const links = [
  { to: '/uus-mang', label: 'nav.newGame' },
  { to: '/ajalugu', label: 'nav.history' },
  { to: '/statistika', label: 'nav.stats' },
  { to: '/mangijad', label: 'nav.players' },
]

export default function Layout() {
  const { t } = useI18n()

  return (
    <div className="min-h-screen pb-16 sm:pb-0">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <div className="text-lg font-semibold tracking-tight">{t('app.name')}</div>
          <div className="flex items-center gap-3">
            <nav className="hidden gap-1 sm:flex">
              {links.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  className={({ isActive }) =>
                    `rounded-md px-3 py-2 text-sm font-medium ${isActive ? 'bg-stone-100 text-stone-900' : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'}`
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
      <nav className="fixed inset-x-0 bottom-0 grid grid-cols-4 border-t border-stone-200 bg-white pb-[env(safe-area-inset-bottom)] sm:hidden">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              `border-t-2 py-3 text-center text-xs ${isActive ? 'border-stone-900 font-semibold text-stone-900' : 'border-transparent text-stone-500'}`
            }
          >
            {t(l.label)}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
