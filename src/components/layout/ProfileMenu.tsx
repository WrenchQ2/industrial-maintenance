import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, Settings, UserRound } from 'lucide-react'
import { useAppData } from '../../context/AppDataContext'
import { useClickOutside } from '../../hooks/useClickOutside'
import { Avatar } from '../ui/Avatar'

export function ProfileMenu() {
  const { settings } = useAppData()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  const close = useCallback(() => setOpen(false), [])
  const containerRef = useClickOutside<HTMLDivElement>(close, open)

  function goToSettings() {
    setOpen(false)
    navigate('/settings')
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-1.5 transition hover:bg-slate-100 sm:pr-2"
        aria-label="Abrir menú de perfil"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Avatar name={settings.technicianName} size="sm" />
        <span className="hidden text-left xl:block">
          <span className="block max-w-36 truncate text-xs font-semibold text-slate-800">
            {settings.technicianName}
          </span>
          <span className="block text-[10px] text-slate-500">Supervisor demo</span>
        </span>
        <ChevronDown className="hidden h-3.5 w-3.5 text-slate-400 xl:block" aria-hidden="true" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
          <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
            <Avatar name={settings.technicianName} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                {settings.technicianName}
              </p>
              <p className="truncate text-xs text-slate-500">Supervisor de mantenimiento</p>
            </div>
          </div>

          <div className="p-1.5">
            <button
              type="button"
              onClick={goToSettings}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
            >
              <UserRound className="h-4 w-4 text-slate-400" aria-hidden="true" />
              Mi perfil
            </button>
            <button
              type="button"
              onClick={goToSettings}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
            >
              <Settings className="h-4 w-4 text-slate-400" aria-hidden="true" />
              Preferencias
            </button>
          </div>

          <div className="border-t border-slate-100 bg-slate-50 px-4 py-2.5">
            <p className="text-[11px] leading-4 text-slate-500">
              Sesión de demostración local. La autenticación se integrará con FastAPI.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
