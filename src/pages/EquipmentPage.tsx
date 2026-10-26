import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Boxes,
  Eye,
  Pencil,
  Plus,
  SearchX,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react'
import type { Equipment, EquipmentStatus, EquipmentType } from '../types'
import { useAppData } from '../context/AppDataContext'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { DemoNotice } from '../components/ui/DemoNotice'
import { EmptyState } from '../components/ui/EmptyState'
import { SearchInput, SelectInput } from '../components/ui/FormControls'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { EquipmentFormModal } from '../components/equipment/EquipmentFormModal'
import { useToast } from '../components/ui/Toast'
import { formatDate } from '../utils/date'
import { equipmentStatusTone, equipmentTypeTone } from '../utils/status'

const equipmentTypes: EquipmentType[] = [
  'Servomotor',
  'Motor eléctrico',
  'Variador de frecuencia',
  'Robot industrial',
]

const equipmentStatuses: EquipmentStatus[] = [
  'Operativo',
  'En mantenimiento',
  'Con falla',
  'Fuera de servicio',
]

export function EquipmentPage() {
  const { equipment, orders, reports, deleteEquipment } = useAppData()
  const { showToast } = useToast()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('Todos')
  const [statusFilter, setStatusFilter] = useState('Todos')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Equipment | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Equipment | null>(null)
  const [deleting, setDeleting] = useState(false)

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return equipment.filter((item) => {
      const matchesSearch =
        term.length === 0 ||
        [item.code, item.name, item.manufacturer, item.model, item.serialNumber, item.location]
          .join(' ')
          .toLowerCase()
          .includes(term)
      const matchesType = typeFilter === 'Todos' || item.type === typeFilter
      const matchesStatus = statusFilter === 'Todos' || item.status === statusFilter
      return matchesSearch && matchesType && matchesStatus
    })
  }, [equipment, search, typeFilter, statusFilter])

  const filtersActive = search.trim() !== '' || typeFilter !== 'Todos' || statusFilter !== 'Todos'

  function clearFilters() {
    setSearch('')
    setTypeFilter('Todos')
    setStatusFilter('Todos')
  }

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(item: Equipment) {
    setEditing(item)
    setFormOpen(true)
  }

  async function handleDelete() {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      await deleteEquipment(pendingDelete.id)
      showToast(`Equipo ${pendingDelete.code} eliminado junto con su historial asociado.`)
      setPendingDelete(null)
    } catch {
      showToast('No se pudo eliminar el equipo. Inténtalo de nuevo.', 'error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventario de equipos"
        description="Consulta y administra servomotores, variadores, robots industriales y motores eléctricos."
        actions={
          <Button variant="secondary" onClick={openCreate}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Registrar equipo
          </Button>
        }
      />

      <DemoNotice />

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar por código, nombre, fabricante o serie..."
            label="Buscar equipos"
            className="w-full lg:max-w-md"
          />

          <div className="flex flex-col gap-2 sm:flex-row lg:ml-auto">
            <div className="relative">
              <label htmlFor="equipment-type-filter" className="sr-only">
                Filtrar por categoría
              </label>
              <SelectInput
                id="equipment-type-filter"
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                className="h-[42px] min-w-40 py-2"
              >
                <option value="Todos">Todas las categorías</option>
                {equipmentTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </SelectInput>
            </div>

            <div>
              <label htmlFor="equipment-status-filter" className="sr-only">
                Filtrar por estado
              </label>
              <SelectInput
                id="equipment-status-filter"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-[42px] min-w-40 py-2"
              >
                <option value="Todos">Todos los estados</option>
                {equipmentStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </SelectInput>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 px-4 py-3 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            {filtered.length} de {equipment.length} equipos
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
          <span className="ml-auto hidden rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 sm:block">
            Datos demo
          </span>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={filtersActive ? SearchX : Boxes}
            title={filtersActive ? 'No encontramos equipos' : 'El inventario está vacío'}
            description={
              filtersActive
                ? 'Prueba con otra búsqueda o elimina los filtros aplicados.'
                : 'Registra tu primer equipo para empezar a crear órdenes de mantenimiento.'
            }
            action={
              filtersActive ? (
                <Button variant="outline" onClick={clearFilters}>
                  Limpiar filtros
                </Button>
              ) : (
                <Button onClick={openCreate}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Registrar equipo
                </Button>
              )
            }
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] uppercase tracking-wide text-slate-500">
                    <th scope="col" className="px-4 py-3 font-semibold">Equipo</th>
                    <th scope="col" className="px-3 py-3 font-semibold">Categoría</th>
                    <th scope="col" className="hidden px-3 py-3 font-semibold xl:table-cell">
                      Fabricante / modelo
                    </th>
                    <th scope="col" className="hidden px-3 py-3 font-semibold lg:table-cell">
                      Ubicación
                    </th>
                    <th scope="col" className="px-3 py-3 font-semibold">Estado</th>
                    <th scope="col" className="hidden px-3 py-3 font-semibold xl:table-cell">
                      Últ. mantenimiento
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((item) => (
                    <tr key={item.id} className="transition-colors hover:bg-slate-50/70">
                      <td className="max-w-[280px] px-4 py-3.5">
                        <p className="text-xs font-semibold text-navy-700">{item.code}</p>
                        <p className="truncate text-sm font-medium text-slate-800">{item.name}</p>
                        <p className="truncate text-[11px] text-slate-400">S/N {item.serialNumber}</p>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3.5">
                        <Badge tone={equipmentTypeTone(item.type)}>{item.type}</Badge>
                      </td>
                      <td className="hidden max-w-[200px] px-3 py-3.5 xl:table-cell">
                        <p className="truncate text-sm text-slate-700">{item.manufacturer}</p>
                        <p className="truncate text-[11px] text-slate-400">{item.model}</p>
                      </td>
                      <td className="hidden max-w-[180px] px-3 py-3.5 lg:table-cell">
                        <p className="truncate text-xs text-slate-600">{item.location}</p>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3.5">
                        <Badge tone={equipmentStatusTone(item.status)} dot>
                          {item.status}
                        </Badge>
                      </td>
                      <td className="hidden whitespace-nowrap px-3 py-3.5 text-xs text-slate-500 xl:table-cell">
                        {formatDate(item.lastMaintenanceDate)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <EquipmentActions
                          equipment={item}
                          onEdit={() => openEdit(item)}
                          onDelete={() => setPendingDelete(item)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-slate-100 md:hidden">
              {filtered.map((item) => (
                <li key={item.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-navy-700">{item.code}</p>
                      <p className="mt-0.5 truncate text-sm font-semibold text-slate-800">
                        {item.name}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {item.manufacturer} · {item.model}
                      </p>
                    </div>
                    <Badge tone={equipmentStatusTone(item.status)} dot>
                      {item.status}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge tone={equipmentTypeTone(item.type)}>{item.type}</Badge>
                    <span className="text-xs text-slate-500">{item.location}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-400">
                      Últ. mant.: {formatDate(item.lastMaintenanceDate)}
                    </span>
                    <EquipmentActions
                      equipment={item}
                      onEdit={() => openEdit(item)}
                      onDelete={() => setPendingDelete(item)}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      <EquipmentFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        equipment={editing}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Eliminar equipo"
        message={
          pendingDelete
            ? `¿Eliminar ${pendingDelete.code} · ${pendingDelete.name}? También se eliminarán ${orders.filter((order) => order.equipmentId === pendingDelete.id).length} órdenes y ${reports.filter((report) => report.equipmentId === pendingDelete.id).length} reportes asociados de la demostración. Esta acción no se puede deshacer.`
            : ''
        }
        confirmLabel="Eliminar equipo"
        loading={deleting}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => void handleDelete()}
      />
    </div>
  )
}

interface EquipmentActionsProps {
  equipment: Equipment
  onEdit: () => void
  onDelete: () => void
}

function EquipmentActions({ equipment, onEdit, onDelete }: EquipmentActionsProps) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Link
        to={`/equipment/${equipment.id}`}
        className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-navy-50 hover:text-navy-700"
        aria-label={`Ver detalle de ${equipment.name}`}
        title="Ver detalle"
      >
        <Eye className="h-4 w-4" aria-hidden="true" />
      </Link>
      <button
        type="button"
        onClick={onEdit}
        className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
        aria-label={`Editar ${equipment.name}`}
        title="Editar"
      >
        <Pencil className="h-4 w-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition hover:bg-red-50 hover:text-red-600"
        aria-label={`Eliminar ${equipment.name}`}
        title="Eliminar"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  )
}
