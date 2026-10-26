import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ClipboardList } from 'lucide-react'
import type { Equipment, MaintenanceOrder } from '../../types'
import { Badge } from '../ui/Badge'
import { formatDate } from '../../utils/date'
import {
  maintenanceTypeTone,
  orderStatusTone,
  priorityTone,
} from '../../utils/status'

interface RecentOrdersTableProps {
  orders: MaintenanceOrder[]
  equipment: Equipment[]
}

export function RecentOrdersTable({ orders, equipment }: RecentOrdersTableProps) {
  const equipmentById = useMemo(
    () => new Map(equipment.map((item) => [item.id, item])),
    [equipment],
  )

  const recentOrders = useMemo(
    () =>
      [...orders]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 6),
    [orders],
  )

  if (recentOrders.length === 0) {
    return (
      <div className="flex flex-col items-center px-5 py-12 text-center">
        <ClipboardList className="h-6 w-6 text-slate-300" aria-hidden="true" />
        <p className="mt-2 text-sm font-medium text-slate-700">Sin órdenes recientes</p>
        <p className="mt-1 text-xs text-slate-500">Crea una orden para verla en esta tabla.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] uppercase tracking-wide text-slate-500">
            <th scope="col" className="px-5 py-3 font-semibold">Folio</th>
            <th scope="col" className="px-3 py-3 font-semibold">Equipo</th>
            <th scope="col" className="hidden px-3 py-3 font-semibold md:table-cell">Tipo</th>
            <th scope="col" className="hidden px-3 py-3 font-semibold lg:table-cell">Fecha</th>
            <th scope="col" className="hidden px-3 py-3 font-semibold sm:table-cell">Prioridad</th>
            <th scope="col" className="px-3 py-3 font-semibold">Estado</th>
            <th scope="col" className="px-5 py-3 text-right font-semibold">Acción</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {recentOrders.map((order) => {
            const item = equipmentById.get(order.equipmentId)
            return (
              <tr key={order.id} className="transition-colors hover:bg-slate-50/70">
                <td className="whitespace-nowrap px-5 py-3.5 font-semibold text-navy-800">
                  {order.folio}
                </td>
                <td className="max-w-[220px] px-3 py-3.5">
                  <p className="truncate text-sm font-medium text-slate-800">
                    {item?.name ?? 'Equipo no disponible'}
                  </p>
                  <p className="truncate text-xs text-slate-400">{item?.code ?? '—'}</p>
                </td>
                <td className="hidden whitespace-nowrap px-3 py-3.5 md:table-cell">
                  <Badge tone={maintenanceTypeTone(order.type)}>{order.type}</Badge>
                </td>
                <td className="hidden whitespace-nowrap px-3 py-3.5 text-xs text-slate-500 lg:table-cell">
                  {formatDate(order.scheduledDate)}
                </td>
                <td className="hidden whitespace-nowrap px-3 py-3.5 sm:table-cell">
                  <Badge tone={priorityTone(order.priority)}>{order.priority}</Badge>
                </td>
                <td className="whitespace-nowrap px-3 py-3.5">
                  <Badge tone={orderStatusTone(order.status)} dot>
                    {order.status}
                  </Badge>
                </td>
                <td className="whitespace-nowrap px-5 py-3.5 text-right">
                  <Link
                    to={`/orders/${order.id}`}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-navy-700 transition hover:bg-navy-50 hover:text-navy-900"
                    aria-label={`Ver detalle de la orden ${order.folio}`}
                  >
                    Ver
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      </div>

      <ul className="divide-y divide-slate-100 sm:hidden">
        {recentOrders.map((order) => {
          const item = equipmentById.get(order.equipmentId)
          return (
            <li key={order.id}>
              <Link
                to={`/orders/${order.id}`}
                className="block px-4 py-3.5 transition hover:bg-slate-50/70"
                aria-label={`Ver detalle de la orden ${order.folio}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-navy-700">{order.folio}</span>
                  <Badge tone={orderStatusTone(order.status)} dot>
                    {order.status}
                  </Badge>
                </div>
                <p className="mt-1 truncate text-sm font-medium text-slate-800">
                  {item?.name ?? 'Equipo no disponible'}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <Badge tone={maintenanceTypeTone(order.type)}>{order.type}</Badge>
                  <Badge tone={priorityTone(order.priority)}>{order.priority}</Badge>
                  <span className="text-[11px] text-slate-400">{formatDate(order.scheduledDate)}</span>
                  <ArrowRight className="ml-auto h-3.5 w-3.5 text-slate-300" aria-hidden="true" />
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
