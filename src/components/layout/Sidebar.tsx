import { NavLink, useNavigate } from 'react-router-dom'
import {
  ChevronLeft,
  ChevronRight,
  Factory,
  FlaskConical,
  X,
} from 'lucide-react'
import { navigationItems } from '../../config/navigation'
import { cn } from '../../utils/cn'

interface SidebarProps {
  collapsed: boolean
  mobile?: boolean
  onToggleCollapse: () => void
  onCloseMobile?: () => void
}

export function Sidebar({ collapsed, mobile = false, onToggleCollapse, onCloseMobile }: SidebarProps) {
  const navigate = useNavigate()
  const isCollapsed = !mobile && collapsed

  return (
    <aside
      className={cn(
        'flex h-full flex-col bg-navy-950 text-slate-300',
        mobile ? 'w-[280px]' : 'w-64 transition-[width] duration-200',
        !mobile && (isCollapsed ? 'lg:w-20' : 'lg:w-64'),
        !mobile && 'fixed inset-y-0 left-0 z-40 hidden lg:flex',
      )}
      aria-label="Navegación principal"
    >
      <div
        className={cn(
          'flex h-16 items-center border-b border-white/10 px-4',
          isCollapsed ? 'justify-center' : 'justify-between',
        )}
      >
        <button
          type="button"
          onClick={() => navigate('/')}
          className={cn('flex min-w-0 items-center gap-3 rounded-lg text-left', isCollapsed && 'justify-center')}
          aria-label="Ir al dashboard"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-500/15 ring-1 ring-inset ring-teal-400/30">
            <Factory className="h-5 w-5 text-teal-400" aria-hidden="true" />
          </span>
          {!isCollapsed && (
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold tracking-wide text-white">
                Industrial Maintenance
              </span>
              <span className="block text-[11px] font-semibold tracking-[0.18em] text-teal-400">
                AI · DEMO
              </span>
            </span>
          )}
        </button>

        {mobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
      </div>

      <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 py-4">
        {!isCollapsed && (
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Operaciones
          </p>
        )}
        <ul className="space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.path === '/'}
                  onClick={onCloseMobile}
                  title={isCollapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    cn(
                      'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      isCollapsed && 'justify-center px-2',
                      isActive
                        ? 'bg-white/10 text-white'
                        : 'text-slate-400 hover:bg-white/5 hover:text-slate-100',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span
                          className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-teal-400"
                          aria-hidden="true"
                        />
                      )}
                      <Icon
                        className={cn(
                          'h-[18px] w-[18px] shrink-0',
                          isActive ? 'text-teal-400' : 'text-slate-500 group-hover:text-slate-300',
                        )}
                        aria-hidden="true"
                      />
                      {!isCollapsed && <span className="truncate">{item.label}</span>}
                    </>
                  )}
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="border-t border-white/10 p-3">
        {!isCollapsed ? (
          <div className="rounded-lg bg-white/5 p-3">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-200">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              Datos locales de demostración
            </div>
            <p className="mt-1.5 flex items-center gap-1.5 text-[11px] leading-4 text-slate-500">
              <FlaskConical className="h-3 w-3 shrink-0" aria-hidden="true" />
              Sin conexión a FastAPI ni SQL Server.
            </p>
          </div>
        ) : (
          <span
            className="mx-auto block h-2 w-2 rounded-full bg-emerald-400"
            title="Datos locales de demostración"
          />
        )}

        {!mobile && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className={cn(
              'mt-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-400 transition hover:bg-white/5 hover:text-slate-200',
              isCollapsed && 'justify-center px-0',
            )}
            aria-label={collapsed ? 'Expandir menú lateral' : 'Contraer menú lateral'}
            title={collapsed ? 'Expandir menú' : 'Contraer menú'}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                <span>Contraer menú</span>
              </>
            )}
          </button>
        )}
      </div>
    </aside>
  )
}
