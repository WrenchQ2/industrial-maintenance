import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ClipboardList, Plus, SearchX, SlidersHorizontal } from 'lucide-react'
import type {
  Equipment,
  MaintenanceOrder,
  MaintenanceOrderStatus,
  MaintenancePriority,
  MaintenanceType,
} from '../types'
import { useAppData } from '../context/AppDataContext'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { DemoNotice } from '../components/ui/DemoNotice'
import { EmptyState } from '../components/ui/EmptyState'
import { SearchInput, SelectInput } from '../components/ui/FormControls'
import { OrderFormModal } from '../components/orders/OrderFormModal'
import { formatDate } from '../utils/date'
import {
  maintenanceTypeTone,
  orderStatusTone,
  priorityTone,
} from '../utils/status'

const statusOptions: MaintenanceOrderStatus[] = [
  'Pendiente',
  'En progreso',
  'Completada',
  'Cancelada',
]

const priorityOptions: MaintenancePriority[] = ['Alta', 'Media', 'Baja']
const typeOptions: MaintenanceType[] = ['Preventivo', 'Correctivo']

export function OrdersPage() {
  const { orders, equipment } = useAppData()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('Todos')
  const [priorityFilter, setPriorityFilter] = useState('Todas')
  const [typeFilter, setTypeFilter] = useState('Todos')
  const [formOpen, setFormOpen] = useState(false)

  const equipmentById = useMemo(
    () => new Map(equipment.map((item) => [item.id, item])),
    [equipment],
  )

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return [...orders]
      .filter((order) => {
        const item = equipmentById.get(order.equipmentId)
        const matchesSearch =
          term.length === 0 ||
          [order.folio, order.description, order.technician, item?.name, item?.code]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(term)
        const matchesStatus = statusFilter === 'Todos' || order.status === statusFilter
        const matchesPriority = priorityFilter === 'Todas' || order.priority === priorityFilter
        const matchesType = typeFilter === 'Todos' || order.type === typeFilter
        return matchesSearch && matchesStatus && matchesPriority && matchesType
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [orders, equipmentById, search, statusFilter, priorityFilter, typeFilter])

  const filtersActive =
    search.trim() !== '' ||
    statusFilter !== 'Todos' ||
    priorityFilter !== 'Todas' ||
    typeFilter !== 'Todos'

  function clearFilters() {
    setSearch('')
    setStatusFilter('Todos')
    setPriorityFilter('Todas')
    setTypeFilter('Todos')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Órdenes de mantenimiento"
        description="Planifica y da seguimiento a las intervenciones preventivas y correctivas."
        actions={
          <Button variant="secondary" onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nueva orden
          </Button>
        }
      />

      <DemoNotice />

      <Card>
        <div className="space-y-3 border-b border-slate-100 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Buscar por folio, equipo o técnico..."
              label="Buscar órdenes"
              className="w-full lg:max-w-md"
            />

            <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-3 lg:max-w-2xl lg:ml-auto">
              <div>
                <label htmlFor="order-status-filter" className="sr-only">
                  Filtrar por estado
                </label>
                <SelectInput
                  id="order-status-filter"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="h-[42px] py-2"
                >
                  <option value="Todos">Todos los estados</option>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </SelectInput>
              </div>
              <div>
                <label htmlFor="order-priority-filter" className="sr-only">
                  Filtrar por prioridad
                </label>
                <SelectInput
                  id="order-priority-filter"
                  value={priorityFilter}
                  onChange={(event) => setPriorityFilter(event.target.value)}
                  className="h-[42px] py-2"
                >
                  <option value="Todas">Todas las prioridades</option>
                  {priorityOptions.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </SelectInput>
              </div>
              <div>
                <label htmlFor="order-type-filter" className="sr-only">
                  Filtrar por tipo
                </label>
                <SelectInput
                  id="order-type-filter"
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value)}
                  className="h-[42px] py-2"
                >
                  <option value="Todos">Todos los tipos</option>
                  {typeOptions.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </SelectInput>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 px-4 py-3 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            {filtered.length} de {orders.length} órdenes
          </span>
          {filtersActive && (
            <button
              type="button"
              onClick={clearFilters}
              className="font-medium text-teal-700 hover:text-teal-800 hover:underline"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={filtersActive ? SearchX : ClipboardList}
            title={filtersActive ? 'No encontramos órdenes' : 'No hay órdenes registradas'}
            description={
              filtersActive
                ? 'Prueba otra combinación de búsqueda y filtros.'
                : 'Crea una orden para planificar el primer trabajo de mantenimiento.'
            }
            action={
              filtersActive ? (
                <Button variant="outline" onClick={clearFilters}>
                  Limpiar filtros
                </Button>
              ) : (
                <Button onClick={() => setFormOpen(true)}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Nueva orden
                </Button>
              )
            }
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[940px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] uppercase tracking-wide text-slate-500">
                    <th scope="col" className="px-4 py-3 font-semibold">Folio</th>
                    <th scope="col" className="px-3 py-3 font-semibold">Equipo</th>
                    <th scope="col" className="hidden px-3 py-3 font-semibold 2xl:table-cell">
                      Descripción
                    </th>
                    <th scope="col" className="px-3 py-3 font-semibold">Tipo</th>
                    <th scope="col" className="px-3 py-3 font-semibold">Prioridad</th>
                    <th scope="col" className="hidden px-3 py-3 font-semibold lg:table-cell">
                      Técnico
                    </th>
                    <th scope="col" className="hidden px-3 py-3 font-semibold xl:table-cell">
                      Programada
                    </th>
                    <th scope="col" className="px-3 py-3 font-semibold">Estado</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((order) => (
                    <OrderRow
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
                          {item?.code ?? '—'} · {order.technician}
                        </p>
                      </div>
                      <Badge tone={orderStatusTone(order.status)} dot>
                        {order.status}
                      </Badge>
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
                      {order.description}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Badge tone={maintenanceTypeTone(order.type)}>{order.type}</Badge>
                      <Badge tone={priorityTone(order.priority)}>{order.priority}</Badge>
                      <span className="text-[11px] text-slate-400">
                        {formatDate(order.scheduledDate)}
                      </span>
                      <Link
                        to={`/orders/${order.id}`}
                        className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-navy-700 hover:bg-navy-50"
                        aria-label={`Ver detalle de la orden ${order.folio}`}
                      >
                        Detalle
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    </div>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </Card>

      <OrderFormModal open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  )
}

function OrderRow({
  order,
  equipment,
}: {
  order: MaintenanceOrder
  equipment: Equipment | undefined
}) {
  return (
    <tr className="transition-colors hover:bg-slate-50/70">
      <td className="whitespace-nowrap px-4 py-3.5 font-semibold text-navy-800">{order.folio}</td>
      <td className="max-w-[190px] px-3 py-3.5">
        <p className="truncate text-sm font-medium text-slate-800">
          {equipment?.name ?? 'Equipo no disponible'}
        </p>
        <p className="text-[11px] text-slate-400">{equipment?.code ?? '—'}</p>
      </td>
      <td className="hidden max-w-[220px] px-3 py-3.5 2xl:table-cell">
        <p className="truncate text-xs text-slate-500" title={order.description}>
          {order.description}
        </p>
      </td>
      <td className="whitespace-nowrap px-3 py-3.5">
        <Badge tone={maintenanceTypeTone(order.type)}>{order.type}</Badge>
      </td>
      <td className="whitespace-nowrap px-3 py-3.5">
        <Badge tone={priorityTone(order.priority)}>{order.priority}</Badge>
      </td>
      <td className="hidden max-w-[160px] px-3 py-3.5 lg:table-cell">
        <p className="truncate text-xs text-slate-600">{order.technician}</p>
      </td>
      <td className="hidden whitespace-nowrap px-3 py-3.5 text-xs text-slate-500 xl:table-cell">
        {formatDate(order.scheduledDate)}
      </td>
      <td className="whitespace-nowrap px-3 py-3.5">
        <Badge tone={orderStatusTone(order.status)} dot>
          {order.status}
        </Badge>
      </td>
      <td className="whitespace-nowrap px-4 py-3.5 text-right">
        <Link
          to={`/orders/${order.id}`}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-navy-700 transition hover:bg-navy-50 hover:text-navy-900"
          aria-label={`Ver detalle de la orden ${order.folio}`}
        >
          Detalle
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </td>
    </tr>
  )
}
