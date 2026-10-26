import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Boxes,
  CalendarClock,
  ClipboardList,
  Cpu,
  Gauge,
  MapPin,
  Pencil,
  Plus,
  Radio,
  Thermometer,
  Wrench,
} from 'lucide-react'
import { useAppData } from '../context/AppDataContext'
import { Button } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'
import { EquipmentFormModal } from '../components/equipment/EquipmentFormModal'
import { OrderFormModal } from '../components/orders/OrderFormModal'
import { DemoNotice } from '../components/ui/DemoNotice'
import { formatDate } from '../utils/date'
import {
  equipmentStatusTone,
  equipmentTypeTone,
  maintenanceTypeTone,
  orderStatusTone,
} from '../utils/status'

export function EquipmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { equipment, orders } = useAppData()
  const [editOpen, setEditOpen] = useState(false)
  const [orderOpen, setOrderOpen] = useState(false)

  const item = equipment.find((entry) => entry.id === id)
  const relatedOrders = useMemo(
    () =>
      orders
        .filter((order) => order.equipmentId === id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [orders, id],
  )
  const maintenanceHistory = relatedOrders.filter((order) => order.status === 'Completada')

  if (!item) {
    return (
      <Card className="mx-auto max-w-xl">
        <EmptyState
          icon={Boxes}
          title="Equipo no encontrado"
          description="El equipo no existe o fue eliminado de los datos de demostración."
          action={
            <Button onClick={() => navigate('/equipment')}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Volver al inventario
            </Button>
          }
        />
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-teal-700">
              {item.code}
            </span>
            <Badge tone={equipmentTypeTone(item.type)}>{item.type}</Badge>
            <Badge tone={equipmentStatusTone(item.status)} dot>
              {item.status}
            </Badge>
          </div>
        }
        title={item.name}
        description={`${item.manufacturer} ${item.model} · ${item.location}`}
        actions={
          <>
            <Button variant="ghost" onClick={() => navigate('/equipment')}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Volver
            </Button>
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Editar equipo
            </Button>
            <Button variant="secondary" onClick={() => setOrderOpen(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Nueva orden
            </Button>
          </>
        }
      />

      <DemoNotice />

      <div className="grid items-start gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Información general"
            description="Ficha técnica del equipo registrada en la demostración"
          />
          <dl className="grid gap-x-6 gap-y-5 p-5 sm:grid-cols-2">
            <InfoItem label="Identificador" value={item.code} />
            <InfoItem label="Tipo de equipo" value={item.type} />
            <InfoItem label="Fabricante" value={item.manufacturer} />
            <InfoItem label="Modelo" value={item.model} />
            <InfoItem label="Número de serie" value={item.serialNumber} />
            <InfoItem label="Estado operativo">
              <Badge tone={equipmentStatusTone(item.status)} dot>
                {item.status}
              </Badge>
            </InfoItem>
            <InfoItem label="Ubicación">
              <span className="inline-flex items-center gap-1.5 text-sm text-slate-800">
                <MapPin className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                {item.location}
              </span>
            </InfoItem>
            <InfoItem label="Último mantenimiento">
              <span className="inline-flex items-center gap-1.5 text-sm text-slate-800">
                <CalendarClock className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                {formatDate(item.lastMaintenanceDate)}
              </span>
            </InfoItem>
            <InfoItem label="Órdenes totales" value={String(relatedOrders.length)} />
            <InfoItem label="Intervenciones completadas" value={String(maintenanceHistory.length)} />
          </dl>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Observaciones técnicas" description="Notas para futuras intervenciones" />
            <div className="p-5">
              {item.observations ? (
                <p className="text-sm leading-6 text-slate-600">{item.observations}</p>
              ) : (
                <p className="text-sm text-slate-400">No hay observaciones registradas.</p>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Lecturas de parámetros" description="Espacio preparado para telemetría futura" />
            <div className="space-y-3 p-4">
              <FutureMetric icon={Thermometer} label="Temperatura" unit="°C" />
              <FutureMetric icon={Activity} label="Vibración" unit="mm/s" />
              <FutureMetric icon={Gauge} label="Horas de operación" unit="h" />
              <div className="flex items-start gap-2 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-[11px] leading-4 text-slate-500">
                <Radio className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                <p>
                  Sin sensores conectados. Los valores se mostrarán cuando se integre una fuente de
                  telemetría; no son lecturas reales.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Historial de mantenimiento"
            description="Órdenes completadas asociadas a este equipo"
            action={
              <Badge tone="neutral">{maintenanceHistory.length} registros</Badge>
            }
          />
          {maintenanceHistory.length === 0 ? (
            <EmptyState
              icon={Wrench}
              title="Sin mantenimientos completados"
              description="Las órdenes completadas aparecerán aquí como historial del equipo."
              className="py-10"
            />
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] uppercase tracking-wide text-slate-500">
                      <th scope="col" className="px-5 py-3 font-semibold">Folio</th>
                      <th scope="col" className="px-3 py-3 font-semibold">Fecha</th>
                      <th scope="col" className="px-3 py-3 font-semibold">Tipo</th>
                      <th scope="col" className="px-3 py-3 font-semibold">Técnico</th>
                      <th scope="col" className="px-5 py-3 text-right font-semibold">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {maintenanceHistory.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50/60">
                        <td className="whitespace-nowrap px-5 py-3 text-xs font-semibold text-navy-700">
                          {order.folio}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-xs text-slate-500">
                          {formatDate(order.completedAt ?? order.scheduledDate)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3">
                          <Badge tone={maintenanceTypeTone(order.type)}>{order.type}</Badge>
                        </td>
                        <td className="px-3 py-3 text-xs text-slate-600">{order.technician}</td>
                        <td className="px-5 py-3 text-right">
                          <Link
                            to={`/orders/${order.id}`}
                            className="inline-flex items-center gap-1 text-xs font-medium text-navy-700 hover:underline"
                            aria-label={`Ver orden ${order.folio}`}
                          >
                            Ver orden
                            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="divide-y divide-slate-100 md:hidden">
                {maintenanceHistory.map((order) => (
                  <li key={order.id}>
                    <Link
                      to={`/orders/${order.id}`}
                      className="block px-4 py-3 transition hover:bg-slate-50/60"
                      aria-label={`Ver orden ${order.folio}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-navy-700">{order.folio}</span>
                        <Badge tone={maintenanceTypeTone(order.type)}>{order.type}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatDate(order.completedAt ?? order.scheduledDate)} · {order.technician}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Órdenes relacionadas"
            description="Actividad reciente del equipo"
            action={
              <Button variant="ghost" size="sm" onClick={() => setOrderOpen(true)}>
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Añadir
              </Button>
            }
          />
          {relatedOrders.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="Sin órdenes"
              description="Crea una orden para este equipo."
              className="py-10"
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {relatedOrders.slice(0, 5).map((order) => (
                <li key={order.id}>
                  <Link
                    to={`/orders/${order.id}`}
                    className="group block px-5 py-3.5 transition hover:bg-slate-50/70"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-navy-700">{order.folio}</span>
                      <Badge tone={orderStatusTone(order.status)} dot>
                        {order.status}
                      </Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                      {order.description}
                    </p>
                    <p className="mt-1 text-[10px] text-slate-400">
                      {order.type} · {formatDate(order.scheduledDate)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white p-4 text-xs leading-5 text-slate-500">
        <Cpu className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
        <p>
          Esta ficha es parte de un prototipo frontend. La información del equipo se guarda en
          localStorage y todavía no se sincroniza con SQL Server.
        </p>
      </div>

      <EquipmentFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        equipment={item}
      />
      <OrderFormModal
        open={orderOpen}
        onClose={() => setOrderOpen(false)}
        initialEquipmentId={item.id}
        onCreated={(order) => navigate(`/orders/${order.id}`)}
      />
    </div>
  )
}

function InfoItem({
  label,
  value,
  children,
}: {
  label: string
  value?: string
  children?: ReactNode
}) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-slate-800">
        {children ?? value ?? '—'}
      </dd>
    </div>
  )
}

function FutureMetric({
  icon: Icon,
  label,
  unit,
}: {
  icon: LucideIcon
  label: string
  unit: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5">
      <Icon className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
      <span className="flex-1 text-xs text-slate-600">{label}</span>
      <span className="text-sm font-semibold text-slate-300">—</span>
      <span className="text-[10px] text-slate-400">{unit}</span>
      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-slate-500">
        Sin conexión
      </span>
    </div>
  )
}
