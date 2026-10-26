import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Menu, Search, X } from 'lucide-react'
import { getPageTitle } from '../../config/navigation'
import { useAppData } from '../../context/AppDataContext'
import { GlobalSearch } from './GlobalSearch'
import { NotificationsMenu } from './NotificationsMenu'
import { ProfileMenu } from './ProfileMenu'

export function Topbar({ onOpenMobileSidebar }: { onOpenMobileSidebar: () => void }) {
  const location = useLocation()
  const { settings } = useAppData()
  const pageTitle = getPageTitle(location.pathname)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)

  useEffect(() => {
    setMobileSearchOpen(false)
  }, [location.pathname])

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden"
          aria-label="Abrir menú de navegación"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="min-w-0">
          <p className="hidden text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 sm:block">
            Operaciones
          </p>
          <h2 className="truncate text-sm font-semibold text-slate-800 sm:-mt-0.5 sm:text-[15px]">
            {pageTitle}
          </h2>
        </div>

        <div className="ml-auto hidden w-full max-w-xs md:block xl:max-w-sm">
          <GlobalSearch />
        </div>

        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <button
            type="button"
            onClick={() => setMobileSearchOpen((value) => !value)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 md:hidden"
            aria-label={mobileSearchOpen ? 'Cerrar búsqueda' : 'Abrir búsqueda'}
            aria-expanded={mobileSearchOpen}
          >
            {mobileSearchOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Search className="h-5 w-5" aria-hidden="true" />
            )}
          </button>

          {settings.notificationsEnabled && <NotificationsMenu />}

          <div className="mx-1.5 h-6 w-px bg-slate-200" aria-hidden="true" />

          <ProfileMenu />
        </div>
      </div>

      {mobileSearchOpen && (
        <div className="border-t border-slate-100 bg-white px-4 py-2.5 md:hidden">
          <GlobalSearch autoFocus onNavigate={() => setMobileSearchOpen(false)} />
        </div>
      )}
    </header>
  )
}
