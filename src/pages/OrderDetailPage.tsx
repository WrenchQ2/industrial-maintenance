import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowLeft,
  ArrowRight,
  Boxes,
  CalendarCheck2,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  ClipboardList,
  Clock,
  Save,
  UserRound,
} from 'lucide-react'
import type { MaintenanceOrderStatus } from '../types'
import { useAppData } from '../context/AppDataContext'
import { Button } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'
import { SelectInput } from '../components/ui/FormControls'
import { DemoNotice } from '../components/ui/DemoNotice'
import { useToast } from '../components/ui/Toast'
import { formatDate, formatDateTime } from '../utils/date'
import {
  equipmentStatusTone,
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

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { orders, equipment, updateOrderStatus } = useAppData()
  const { showToast } = useToast()

  const order = orders.find((entry) => entry.id === id)
  const item = equipment.find((entry) => entry.id === order?.equipmentId)

  const [selectedStatus, setSelectedStatus] = useState<MaintenanceOrderStatus>(
    order?.status ?? 'Pendiente',
  )
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    if (order) setSelectedStatus(order.status)
  }, [order])

  if (!order) {
    return (
      <Card className="mx-auto max-w-xl">
        <EmptyState
          icon={ClipboardList}
          title="Orden no encontrada"
          description="La orden no existe o fue eliminada junto con su equipo."
          action={
            <Button onClick={() => navigate('/orders')}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Volver a órdenes
            </Button>
          }
        />
      </Card>
    )
  }

  const statusChanged = selectedStatus !== order.status

  async function handleUpdateStatus() {
    if (!order || !statusChanged) return
    setUpdating(true)
    try {
      const updated = await updateOrderStatus(order.id, selectedStatus)
      showToast(
        updated.status === 'Completada'
          ? `Orden ${updated.folio} completada. Se actualizó el último mantenimiento del equipo.`
          : `Estado de la orden ${updated.folio} actualizado a "${updated.status}".`,
      )
    } catch {
      showToast('No se pudo actualizar el estado de la orden.', 'error')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-teal-700">
              {order.folio}
            </span>
            <Badge tone={maintenanceTypeTone(order.type)}>{order.type}</Badge>
            <Badge tone={priorityTone(order.priority)}>Prioridad {order.priority}</Badge>
            <Badge tone={orderStatusTone(order.status)} dot>
              {order.status}
            </Badge>
          </div>
        }
        title={`Orden ${order.folio}`}
        description={
          item ? `${item.code} · ${item.name}` : 'Equipo no disponible en la demostración'
        }
        actions={
          <>
            <Button variant="ghost" onClick={() => navigate('/orders')}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Volver
            </Button>
            {item && (
              <Link to={`/equipment/${item.id}`}>
                <Button variant="outline">
                  <Boxes className="h-4 w-4" aria-hidden="true" />
                  Ver equipo
                </Button>
              </Link>
            )}
          </>
        }
      />

      <DemoNotice />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader
              title="Detalle de la orden"
              description="Información registrada para la intervención"
            />
            <div className="space-y-5 p-5">
              <div>
                <h3 className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  Descripción del trabajo
                </h3>
                <p className="mt-1.5 text-sm leading-6 text-slate-700">{order.description}</p>
              </div>

              <dl className="grid gap-x-6 gap-y-5 border-t border-slate-100 pt-5 sm:grid-cols-2">
                <DetailItem label="Tipo de mantenimiento">
                  <Badge tone={maintenanceTypeTone(order.type)}>{order.type}</Badge>
                </DetailItem>
                <DetailItem label="Prioridad">
                  <Badge tone={priorityTone(order.priority)}>{order.priority}</Badge>
                </DetailItem>
                <DetailItem label="Técnico asignado">
                  <span className="inline-flex items-center gap-1.5">
                    <UserRound className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                    {order.technician}
                  </span>
                </DetailItem>
                <DetailItem label="Estado actual">
                  <Badge tone={orderStatusTone(order.status)} dot>
                    {order.status}
                  </Badge>
                </DetailItem>
                <DetailItem label="Fecha de creación">{formatDateTime(order.createdAt)}</DetailItem>
                <DetailItem label="Fecha programada">{formatDate(order.scheduledDate)}</DetailItem>
                <DetailItem label="Fecha de cierre">
                  {order.completedAt ? formatDateTime(order.completedAt) : 'Pendiente de cierre'}
                </DetailItem>
                <DetailItem label="Equipo relacionado">
                  {item ? (
                    <Link
                      to={`/equipment/${item.id}`}
                      className="font-medium text-navy-700 hover:underline"
                    >
                      {item.code} · {item.name}
                    </Link>
                  ) : (
                    'Equipo no disponible'
                  )}
                </DetailItem>
              </dl>
            </div>
          </Card>

          <Card>
            <CardHeader title="Trazabilidad" description="Hitos de la orden de demostración" />
            <ol className="space-y-0 p-5">
              <TimelineItem
                icon={CalendarPlus}
                title="Orden creada"
                detail={formatDateTime(order.createdAt)}
                last={false}
              />
              <TimelineItem
                icon={CalendarDays}
                title="Trabajo programado"
                detail={formatDate(order.scheduledDate)}
                last={false}
              />
              <TimelineItem
                icon={order.status === 'Completada' ? CheckCircle2 : Clock}
                title={
                  order.status === 'Completada'
                    ? 'Mantenimiento completado'
                    : order.status === 'Cancelada'
                      ? 'Orden cancelada'
                      : 'Cierre pendiente'
                }
                detail={
                  order.completedAt
                    ? formatDateTime(order.completedAt)
                    : order.status === 'Cancelada'
                      ? 'La orden no se ejecutará.'
                      : 'Aún no se registra una fecha de cierre.'
                }
                last
              />
            </ol>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Gestión de estado" description="Actualiza el avance del trabajo" />
            <div className="space-y-4 p-5">
              <div>
                <label htmlFor="order-new-status" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Nuevo estado
                </label>
                <SelectInput
                  id="order-new-status"
                  value={selectedStatus}
                  onChange={(event) =>
                    setSelectedStatus(event.target.value as MaintenanceOrderStatus)
                  }
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </SelectInput>
              </div>

              {selectedStatus === 'Completada' && statusChanged && (
                <div className="flex items-start gap-2 rounded-lg bg-emerald-50 p-3 text-xs leading-5 text-emerald-800">
                  <CalendarCheck2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <p>
                    Al completar la orden se actualizará la fecha del último mantenimiento del
                    equipo.
                  </p>
                </div>
              )}

              <Button
                className="w-full"
                onClick={() => void handleUpdateStatus()}
                disabled={!statusChanged}
                loading={updating}
              >
                {!updating && <Save className="h-4 w-4" aria-hidden="true" />}
                Guardar estado
              </Button>
              <p className="text-[11px] leading-4 text-slate-400">
                El cambio se guarda únicamente en este navegador. No se envía a SQL Server.
              </p>
            </div>
          </Card>

          {item && (
            <Card>
              <CardHeader title="Equipo" description="Ficha relacionada" />
              <div className="space-y-4 p-5">
                <div>
                  <p className="text-xs font-semibold text-navy-700">{item.code}</p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-800">{item.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {item.manufacturer} {item.model}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone={equipmentStatusTone(item.status)} dot>
                    {item.status}
                  </Badge>
                </div>
                <dl className="space-y-2 border-t border-slate-100 pt-4 text-xs">
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-400">Ubicación</dt>
                    <dd className="text-right font-medium text-slate-700">{item.location}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-400">N.º de serie</dt>
                    <dd className="text-right font-medium text-slate-700">{item.serialNumber}</dd>
                  </div>
                </dl>
                <Link
                  to={`/equipment/${item.id}`}
                  className="flex items-center justify-center gap-1 rounded-lg border border-slate-200 py-2 text-xs font-medium text-navy-700 transition hover:bg-slate-50"
                >
                  Abrir ficha del equipo
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function DetailItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm text-slate-700">{children}</dd>
    </div>
  )
}

function TimelineItem({
  icon: Icon,
  title,
  detail,
  last,
}: {
  icon: LucideIcon
  title: string
  detail: string
  last: boolean
}) {
  return (
    <li className="relative flex gap-3 pb-5 last:pb-0">
      {!last && (
        <span
          className="absolute bottom-0 left-[15px] top-8 w-px bg-slate-200"
          aria-hidden="true"
        />
      )}
      <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white">
        <Icon className="h-4 w-4 text-slate-500" aria-hidden="true" />
      </span>
      <div className="min-w-0 pt-1">
        <p className="text-sm font-medium text-slate-800">{title}</p>
        <p className="text-xs text-slate-500">{detail}</p>
      </div>
    </li>
  )
}
