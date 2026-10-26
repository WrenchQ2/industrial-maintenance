import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CalendarCheck2,
  History,
  SearchX,
  Wrench,
} from 'lucide-react'
import type { Equipment, MaintenanceOrder } from '../types'
import { useAppData } from '../context/AppDataContext'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardHeader } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { DemoNotice } from '../components/ui/DemoNotice'
import { EmptyState } from '../components/ui/EmptyState'
import { SearchInput, SelectInput } from '../components/ui/FormControls'
import { formatDate } from '../utils/date'
import { maintenanceTypeTone } from '../utils/status'

export function HistoryPage() {
  const { orders, equipment } = useAppData()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('Todos')

  const equipmentById = useMemo(
    () => new Map(equipment.map((item) => [item.id, item])),
    [equipment],
  )

  const completedOrders = useMemo(
    () =>
      orders
        .filter((order) => order.status === 'Completada')
        .sort(
          (a, b) =>
            new Date(b.completedAt ?? b.scheduledDate).getTime() -
            new Date(a.completedAt ?? a.scheduledDate).getTime(),
        ),
    [orders],
  )

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return completedOrders.filter((order) => {
      const item = equipmentById.get(order.equipmentId)
      const matchesSearch =
        term.length === 0 ||
        [order.folio, order.description, order.technician, item?.name, item?.code]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(term)
      const matchesType = typeFilter === 'Todos' || order.type === typeFilter
      return matchesSearch && matchesType
    })
  }, [completedOrders, equipmentById, search, typeFilter])

  const preventiveCount = completedOrders.filter((order) => order.type === 'Preventivo').length
  const correctiveCount = completedOrders.filter((order) => order.type === 'Correctivo').length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Historial de mantenimiento"
        description="Consulta las intervenciones completadas y el trabajo técnico realizado en cada equipo."
        actions={
          <Link to="/orders">
            <span className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50">
              Ver órdenes
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </span>
          </Link>
        }
      />

      <DemoNotice />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <HistoryStat
          label="Intervenciones"
          value={String(completedOrders.length)}
          detail="Órdenes completadas"
        />
        <HistoryStat
          label="Preventivos"
          value={String(preventiveCount)}
          detail="Trabajo planificado"
        />
        <HistoryStat
          label="Correctivos"
          value={String(correctiveCount)}
          detail="Atención de fallas"
        />
        <HistoryStat
          label="Última intervención"
          value={
            completedOrders[0]
              ? formatDate(completedOrders[0].completedAt ?? completedOrders[0].scheduledDate)
              : '—'
          }
          detail="Fecha de cierre más reciente"
        />
      </div>

      <Card>
        <CardHeader
          title="Registro de intervenciones"
          description="El historial se construye con las órdenes marcadas como Completadas."
          action={<Badge tone="neutral">{filtered.length} registros</Badge>}
        />

        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar por folio, equipo o técnico..."
            label="Buscar en el historial"
            className="w-full sm:max-w-md"
          />
          <div className="sm:ml-auto">
            <label htmlFor="history-type-filter" className="sr-only">
              Filtrar por tipo de mantenimiento
            </label>
            <SelectInput
              id="history-type-filter"
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className="h-[42px] min-w-44 py-2"
            >
              <option value="Todos">Todos los tipos</option>
              <option value="Preventivo">Preventivo</option>
              <option value="Correctivo">Correctivo</option>
            </SelectInput>
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={search || typeFilter !== 'Todos' ? SearchX : History}
            title={
              search || typeFilter !== 'Todos'
                ? 'No hay coincidencias'
                : 'El historial está vacío'
            }
            description={
              search || typeFilter !== 'Todos'
                ? 'Ajusta la búsqueda o el filtro de tipo de mantenimiento.'
                : 'Cuando completes una orden de mantenimiento aparecerá en este historial.'
            }
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[780px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] uppercase tracking-wide text-slate-500">
                    <th scope="col" className="px-5 py-3 font-semibold">Fecha de cierre</th>
                    <th scope="col" className="px-3 py-3 font-semibold">Orden</th>
                    <th scope="col" className="px-3 py-3 font-semibold">Equipo</th>
                    <th scope="col" className="px-3 py-3 font-semibold">Tipo</th>
                    <th scope="col" className="hidden px-3 py-3 font-semibold lg:table-cell">
                      Técnico
                    </th>
                    <th scope="col" className="px-5 py-3 text-right font-semibold">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((order) => (
                    <HistoryRow
                      key={order.id}
                      order={order}
                      equipment={equipmentById.get(order.equipmentId)}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-slate-100 md:hidden">
              {filtered.map((order) => {
                const item = equipmentById.get(order.equipmentId)
                return (
                  <li key={order.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-navy-700">{order.folio}</p>
                        <p className="mt-0.5 truncate text-sm font-semibold text-slate-800">
                          {item?.name ?? 'Equipo no disponible'}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          {formatDate(order.completedAt ?? order.scheduledDate)} · {order.technician}
                        </p>
                      </div>
                      <Badge tone={maintenanceTypeTone(order.type)}>{order.type}</Badge>
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
                      {order.description}
                    </p>
                    <Link
                      to={`/orders/${order.id}`}
                      className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-navy-700 hover:underline"
                    >
                      Ver orden
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </Card>

      <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white p-4 text-xs leading-5 text-slate-500">
        <CalendarCheck2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
        <p>
          El historial usa las órdenes completadas de los datos de demostración. Al completar una
          orden desde su detalle, se añade automáticamente a esta vista.
        </p>
      </div>
    </div>
  )
}

function HistoryStat({
  label,
  value,
  detail,
}: {
  label: string
  value: string
  detail: string
}) {
  return (
    <Card className="p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900 sm:text-2xl">{value}</p>
      <p className="mt-0.5 text-[11px] text-slate-500">{detail}</p>
    </Card>
  )
}

function HistoryRow({
  order,
  equipment,
}: {
  order: MaintenanceOrder
  equipment: Equipment | undefined
}) {
  return (
    <tr className="transition-colors hover:bg-slate-50/70">
      <td className="whitespace-nowrap px-5 py-3.5 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <Wrench className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
          {formatDate(order.completedAt ?? order.scheduledDate)}
        </span>
      </td>
      <td className="whitespace-nowrap px-3 py-3.5 text-xs font-semibold text-navy-700">
        {order.folio}
      </td>
      <td className="max-w-[220px] px-3 py-3.5">
        <p className="truncate text-sm font-medium text-slate-800">
          {equipment?.name ?? 'Equipo no disponible'}
        </p>
        <p className="text-[11px] text-slate-400">{equipment?.code ?? '—'}</p>
      </td>
      <td className="whitespace-nowrap px-3 py-3.5">
        <Badge tone={maintenanceTypeTone(order.type)}>{order.type}</Badge>
      </td>
      <td className="hidden px-3 py-3.5 text-xs text-slate-600 lg:table-cell">{order.technician}</td>
      <td className="whitespace-nowrap px-5 py-3.5 text-right">
        <Link
          to={`/orders/${order.id}`}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-navy-700 transition hover:bg-navy-50"
          aria-label={`Ver orden ${order.folio}`}
        >
          Ver detalle
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </td>
    </tr>
  )
}
