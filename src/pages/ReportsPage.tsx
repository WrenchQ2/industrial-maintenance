import { useMemo, useState } from 'react'
import {
  Eye,
  FileSearch,
  FileText,
  Plus,
  SearchX,
} from 'lucide-react'
import type { Equipment, MaintenanceReport, ReportStatus } from '../types'
import { useAppData } from '../context/AppDataContext'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { DemoNotice } from '../components/ui/DemoNotice'
import { EmptyState } from '../components/ui/EmptyState'
import { SearchInput, SelectInput, TextInput } from '../components/ui/FormControls'
import { ReportFormModal } from '../components/reports/ReportFormModal'
import { ReportPreviewModal } from '../components/reports/ReportPreviewModal'
import { formatDate } from '../utils/date'
import { reportStatusTone } from '../utils/status'

const statusOptions: ReportStatus[] = ['Borrador', 'En revisión', 'Aprobado']

export function ReportsPage() {
  const { reports, equipment } = useAppData()
  const [search, setSearch] = useState('')
  const [equipmentFilter, setEquipmentFilter] = useState('Todos')
  const [statusFilter, setStatusFilter] = useState('Todos')
  const [dateFrom, setDateFrom] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [previewId, setPreviewId] = useState<string | null>(null)

  const equipmentById = useMemo(
    () => new Map(equipment.map((item) => [item.id, item])),
    [equipment],
  )

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return [...reports]
      .filter((report) => {
        const item = equipmentById.get(report.equipmentId)
        const matchesSearch =
          term.length === 0 ||
          [report.folio, report.diagnosis, report.technician, item?.name, item?.code]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(term)
        const matchesEquipment =
          equipmentFilter === 'Todos' || report.equipmentId === equipmentFilter
        const matchesStatus = statusFilter === 'Todos' || report.status === statusFilter
        const matchesDate = dateFrom === '' || report.date >= dateFrom
        return matchesSearch && matchesEquipment && matchesStatus && matchesDate
      })
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [reports, equipmentById, search, equipmentFilter, statusFilter, dateFrom])

  const filtersActive =
    search.trim() !== '' ||
    equipmentFilter !== 'Todos' ||
    statusFilter !== 'Todos' ||
    dateFrom !== ''

  function clearFilters() {
    setSearch('')
    setEquipmentFilter('Todos')
    setStatusFilter('Todos')
    setDateFrom('')
  }

  const selectedReport = reports.find((report) => report.id === previewId) ?? null
  const selectedEquipment = selectedReport
    ? equipmentById.get(selectedReport.equipmentId)
    : undefined

  const draftCount = reports.filter((report) => report.status === 'Borrador').length
  const reviewCount = reports.filter((report) => report.status === 'En revisión').length
  const approvedCount = reports.filter((report) => report.status === 'Aprobado').length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reportes técnicos"
        description="Prepara borradores y consulta la documentación técnica de las intervenciones."
        actions={
          <Button variant="secondary" onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nuevo borrador
          </Button>
        }
      />

      <DemoNotice />

      <div className="grid grid-cols-3 gap-3 sm:max-w-xl">
        <StatusSummary label="Borradores" value={draftCount} tone="neutral" />
        <StatusSummary label="En revisión" value={reviewCount} tone="warning" />
        <StatusSummary label="Aprobados" value={approvedCount} tone="success" />
      </div>

      <Card>
        <CardHeader
          title="Reportes registrados"
          description="Filtra por equipo, estado o fecha de intervención"
          action={<Badge tone="neutral">{filtered.length} de {reports.length}</Badge>}
        />

        <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-2 xl:grid-cols-12 xl:items-end">
          <div className="xl:col-span-4">
            <label htmlFor="report-search" className="mb-1.5 block text-xs font-medium text-slate-500">
              Buscar
            </label>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Folio, equipo o diagnóstico..."
              label="Buscar reportes"
            />
          </div>

          <div className="xl:col-span-3">
            <label htmlFor="report-equipment-filter" className="mb-1.5 block text-xs font-medium text-slate-500">
              Equipo
            </label>
            <SelectInput
              id="report-equipment-filter"
              value={equipmentFilter}
              onChange={(event) => setEquipmentFilter(event.target.value)}
            >
              <option value="Todos">Todos los equipos</option>
              {equipment.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code} · {item.name}
                </option>
              ))}
            </SelectInput>
          </div>

          <div className="xl:col-span-2">
            <label htmlFor="report-status-filter" className="mb-1.5 block text-xs font-medium text-slate-500">
              Estado
            </label>
            <SelectInput
              id="report-status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="Todos">Todos</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </SelectInput>
          </div>

          <div className="xl:col-span-3">
            <label htmlFor="report-date-filter" className="mb-1.5 block text-xs font-medium text-slate-500">
              Fecha desde
            </label>
            <TextInput
              id="report-date-filter"
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
            />
          </div>
        </div>

        {filtersActive && (
          <div className="flex justify-end border-b border-slate-100 px-4 py-2">
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-medium text-teal-700 hover:text-teal-800 hover:underline"
            >
              Limpiar filtros
            </button>
          </div>
        )}

        {filtered.length === 0 ? (
          <EmptyState
            icon={filtersActive ? SearchX : FileText}
            title={filtersActive ? 'No encontramos reportes' : 'No hay reportes técnicos'}
            description={
              filtersActive
                ? 'Prueba con otro equipo, estado o rango de fechas.'
                : 'Crea un borrador para documentar un diagnóstico y las actividades realizadas.'
            }
            action={
              filtersActive ? (
                <Button variant="outline" onClick={clearFilters}>
                  Limpiar filtros
                </Button>
              ) : (
                <Button onClick={() => setFormOpen(true)}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Nuevo borrador
                </Button>
              )
            }
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] uppercase tracking-wide text-slate-500">
                    <th scope="col" className="px-5 py-3 font-semibold">Folio</th>
                    <th scope="col" className="px-3 py-3 font-semibold">Equipo</th>
                    <th scope="col" className="px-3 py-3 font-semibold">Fecha</th>
                    <th scope="col" className="hidden px-3 py-3 font-semibold lg:table-cell">
                      Técnico
                    </th>
                    <th scope="col" className="px-3 py-3 font-semibold">Estado</th>
                    <th scope="col" className="px-5 py-3 text-right font-semibold">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((report) => (
                    <ReportRow
                      key={report.id}
                      report={report}
                      equipment={equipmentById.get(report.equipmentId)}
                      onPreview={() => setPreviewId(report.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-slate-100 md:hidden">
              {filtered.map((report) => {
                const item = equipmentById.get(report.equipmentId)
                return (
                  <li key={report.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-navy-700">{report.folio}</p>
                        <p className="mt-0.5 truncate text-sm font-semibold text-slate-800">
                          {item?.name ?? 'Equipo no disponible'}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          {formatDate(report.date)} · {report.technician}
                        </p>
                      </div>
                      <Badge tone={reportStatusTone(report.status)} dot>
                        {report.status}
                      </Badge>
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
                      {report.diagnosis}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => setPreviewId(report.id)}
                    >
                      <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                      Vista previa
                    </Button>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </Card>

      <ReportFormModal open={formOpen} onClose={() => setFormOpen(false)} />
      <ReportPreviewModal
        report={selectedReport}
        equipment={selectedEquipment}
        onClose={() => setPreviewId(null)}
      />
    </div>
  )
}

function StatusSummary({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'neutral' | 'warning' | 'success'
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
      <span className="text-xs text-slate-500">{label}</span>
      <Badge tone={tone}>{value}</Badge>
    </div>
  )
}

function ReportRow({
  report,
  equipment,
  onPreview,
}: {
  report: MaintenanceReport
  equipment: Equipment | undefined
  onPreview: () => void
}) {
  return (
    <tr className="transition-colors hover:bg-slate-50/70">
      <td className="whitespace-nowrap px-5 py-3.5 text-xs font-semibold text-navy-700">
        {report.folio}
      </td>
      <td className="max-w-[220px] px-3 py-3.5">
        <p className="truncate text-sm font-medium text-slate-800">
          {equipment?.name ?? 'Equipo no disponible'}
        </p>
        <p className="text-[11px] text-slate-400">{equipment?.code ?? '—'}</p>
      </td>
      <td className="whitespace-nowrap px-3 py-3.5 text-xs text-slate-500">
        {formatDate(report.date)}
      </td>
      <td className="hidden px-3 py-3.5 text-xs text-slate-600 lg:table-cell">
        {report.technician}
      </td>
      <td className="whitespace-nowrap px-3 py-3.5">
        <Badge tone={reportStatusTone(report.status)} dot>
          {report.status}
        </Badge>
      </td>
      <td className="whitespace-nowrap px-5 py-3.5 text-right">
        <button
          type="button"
          onClick={onPreview}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-navy-700 transition hover:bg-navy-50"
          aria-label={`Ver vista previa del reporte ${report.folio}`}
        >
          <FileSearch className="h-3.5 w-3.5" aria-hidden="true" />
          Vista previa
        </button>
      </td>
    </tr>
  )
}
