import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, AlertTriangle, CalendarClock, ShieldAlert } from 'lucide-react'
import type { Equipment } from '../../types'
import { daysSince, formatDate } from '../../utils/date'
import { Badge } from '../ui/Badge'
import { equipmentStatusTone } from '../../utils/status'

interface AlertEntry {
  equipment: Equipment
  kind: 'critical' | 'warning' | 'neutral'
  label: string
  detail: string
}

function buildAlerts(equipment: Equipment[]): AlertEntry[] {
  return equipment
    .map((item): AlertEntry | null => {
      if (item.status === 'Con falla') {
        return {
          equipment: item,
          kind: 'critical',
          label: 'Falla reportada',
          detail: `${item.code} requiere diagnóstico y seguimiento.`,
        }
      }

      if (item.status === 'Fuera de servicio') {
        return {
          equipment: item,
          kind: 'critical',
          label: 'Fuera de servicio',
          detail: `${item.code} está detenido hasta completar la reparación.`,
        }
      }

      const days = daysSince(item.lastMaintenanceDate)
      if (days >= 100) {
        return {
          equipment: item,
          kind: 'warning',
          label: 'Mantenimiento próximo',
          detail: `${days} días desde el último mantenimiento (${formatDate(item.lastMaintenanceDate)}).`,
        }
      }

      if (item.status === 'En mantenimiento') {
        return {
          equipment: item,
          kind: 'warning',
          label: 'En mantenimiento',
          detail: `${item.code} se encuentra intervenido y no está disponible.`,
        }
      }

      return null
    })
    .filter((item): item is AlertEntry => item !== null)
    .slice(0, 5)
}

const kindStyles = {
  critical: {
    icon: ShieldAlert,
    iconClass: 'bg-red-50 text-red-600',
  },
  warning: {
    icon: AlertTriangle,
    iconClass: 'bg-amber-50 text-amber-600',
  },
  neutral: {
    icon: CalendarClock,
    iconClass: 'bg-slate-100 text-slate-500',
  },
}

export function EquipmentAlerts({ equipment }: { equipment: Equipment[] }) {
  const alerts = useMemo(() => buildAlerts(equipment), [equipment])

  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center px-5 py-12 text-center">
        <AlertTriangle className="h-6 w-6 text-slate-300" aria-hidden="true" />
        <p className="mt-2 text-sm font-medium text-slate-700">Sin alertas activas</p>
        <p className="mt-1 text-xs text-slate-500">
          Todos los equipos están operativos y al día.
        </p>
      </div>
    )
  }

  return (
    <ul className="divide-y divide-slate-100">
      {alerts.map((alert) => {
        const style = kindStyles[alert.kind]
        const Icon = style.icon
        return (
          <li key={alert.equipment.id}>
            <Link
              to={`/equipment/${alert.equipment.id}`}
              className="group flex items-start gap-3 px-5 py-3.5 transition hover:bg-slate-50/70"
            >
              <span
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${style.iconClass}`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="truncate text-sm font-medium text-slate-800">
                    {alert.equipment.name}
                  </span>
                  <Badge tone={equipmentStatusTone(alert.equipment.status)}>
                    {alert.equipment.status}
                  </Badge>
                </span>
                <span className="mt-0.5 block text-xs leading-5 text-slate-500">{alert.detail}</span>
                <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-wide text-slate-400">
                  {alert.label} · {alert.equipment.location}
                </span>
              </span>
              <ArrowRight
                className="mt-1.5 h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-navy-600"
                aria-hidden="true"
              />
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
