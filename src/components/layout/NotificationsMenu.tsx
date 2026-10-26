import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Bell, CheckCheck, Info, ShieldAlert } from 'lucide-react'
import { useAppData } from '../../context/AppDataContext'
import { useClickOutside } from '../../hooks/useClickOutside'
import { formatShortDate } from '../../utils/date'
import { cn } from '../../utils/cn'
import type { NotificationKind } from '../../types'

const kindIcon: Record<NotificationKind, typeof Info> = {
  critical: ShieldAlert,
  warning: AlertTriangle,
  info: Info,
}

const kindStyle: Record<NotificationKind, string> = {
  critical: 'bg-red-50 text-red-600',
  warning: 'bg-amber-50 text-amber-600',
  info: 'bg-sky-50 text-sky-600',
}

export function NotificationsMenu() {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useAppData()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  const close = useCallback(() => setOpen(false), [])
  const containerRef = useClickOutside<HTMLDivElement>(close, open)

  const unread = notifications.filter((item) => !item.read).length

  async function handleNotification(id: string, kind: NotificationKind) {
    await markNotificationRead(id)
    setOpen(false)
    if (kind === 'info') navigate('/reports')
    else navigate('/equipment')
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
        aria-label={`Notificaciones${unread > 0 ? `, ${unread} sin leer` : ''}`}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell className="h-[18px] w-[18px]" aria-hidden="true" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white ring-2 ring-white">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(92vw,22rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Notificaciones</h2>
              <p className="text-[11px] text-slate-500">
                {unread === 0 ? 'Todo al día' : `${unread} sin leer`}
              </p>
            </div>
            <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
              Demo
            </span>
          </div>

          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-500">
              No hay notificaciones.
            </div>
          ) : (
            <ul className="scrollbar-thin max-h-80 divide-y divide-slate-100 overflow-y-auto">
              {notifications.map((notification) => {
                const Icon = kindIcon[notification.kind]
                return (
                  <li key={notification.id}>
                    <button
                      type="button"
                      onClick={() => void handleNotification(notification.id, notification.kind)}
                      className={cn(
                        'flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-slate-50',
                        !notification.read && 'bg-slate-50/60',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                          kindStyle[notification.kind],
                        )}
                      >
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-xs font-semibold text-slate-800">
                            {notification.title}
                          </span>
                          {!notification.read && (
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" />
                          )}
                        </span>
                        <span className="mt-0.5 line-clamp-2 block text-xs leading-5 text-slate-500">
                          {notification.message}
                        </span>
                        <span className="mt-1 block text-[10px] font-medium text-slate-400">
                          {formatShortDate(notification.date)}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          <div className="border-t border-slate-100 p-2">
            <button
              type="button"
              disabled={unread === 0}
              onClick={() => void markAllNotificationsRead()}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
            >
              <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Marcar todas como leídas
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
