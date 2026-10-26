import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  ClipboardList,
  Plus,
  Wrench,
} from 'lucide-react'
import { useAppData } from '../context/AppDataContext'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { DemoNotice } from '../components/ui/DemoNotice'
import { KpiCard } from '../components/dashboard/KpiCard'
import {
  MaintenanceTypeChart,
  MonthlyOrdersChart,
  StatusDistributionChart,
} from '../components/dashboard/Charts'
import { RecentOrdersTable } from '../components/dashboard/RecentOrdersTable'
import { EquipmentAlerts } from '../components/dashboard/EquipmentAlerts'
import { OrderFormModal } from '../components/orders/OrderFormModal'
import { isSameMonth } from '../utils/date'

export function DashboardPage() {
  const { equipment, orders } = useAppData()
  const [orderModalOpen, setOrderModalOpen] = useState(false)
  const navigate = useNavigate()

  const stats = useMemo(() => {
    const now = new Date()
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const completedThisMonth = orders.filter(
      (order) =>
        order.status === 'Completada' &&
        order.completedAt !== null &&
        isSameMonth(order.completedAt, now),
    ).length
    const completedPreviousMonth = orders.filter(
      (order) =>
        order.status === 'Completada' &&
        order.completedAt !== null &&
        isSameMonth(order.completedAt, previousMonth),
    ).length
    const operational = equipment.filter((item) => item.status === 'Operativo').length
    const faults = equipment.filter((item) => item.status === 'Con falla').length
    const pending = orders.filter((order) => order.status === 'Pendiente').length
    const inProgress = orders.filter((order) => order.status === 'En progreso').length
    const difference = completedThisMonth - completedPreviousMonth

    return {
      operational,
      faults,
      pending,
      inProgress,
      completedThisMonth,
      operationalPercent:
        equipment.length > 0 ? Math.round((operational / equipment.length) * 100) : 0,
      comparison:
        completedPreviousMonth === 0
          ? 'Sin cierres el mes anterior'
          : `${difference >= 0 ? '+' : ''}${difference} vs. mes anterior`,
    }
  }, [equipment, orders])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard de mantenimiento"
        description="Supervisa tus equipos y actividades de mantenimiento."
        actions={
          <>
            <Button variant="outline" onClick={() => navigate('/orders')}>
              <ClipboardList className="h-4 w-4" aria-hidden="true" />
              Ver órdenes
            </Button>
            <Button variant="secondary" onClick={() => setOrderModalOpen(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Nueva orden
            </Button>
          </>
        }
      />

      <DemoNotice />

      <section aria-label="Indicadores principales" className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <KpiCard
          label="Total de equipos"
          value={String(equipment.length)}
          caption="Inventario industrial registrado"
          icon={Boxes}
          tone="navy"
        />
        <KpiCard
          label="Equipos operativos"
          value={String(stats.operational)}
          caption={`${stats.operationalPercent}% del inventario`}
          icon={CheckCircle2}
          tone="green"
        />
        <KpiCard
          label="Equipos con fallas"
          value={String(stats.faults)}
          caption={stats.faults > 0 ? 'Requieren atención técnica' : 'Sin fallas reportadas'}
          icon={AlertTriangle}
          tone="red"
        />
        <KpiCard
          label="Órdenes pendientes"
          value={String(stats.pending)}
          caption={`${stats.inProgress} en progreso`}
          icon={ClipboardList}
          tone="amber"
        />
        <KpiCard
          label="Mantenimientos del mes"
          value={String(stats.completedThisMonth)}
          caption={stats.comparison}
          icon={Wrench}
          tone="teal"
        />
      </section>

      <section aria-label="Gráficas de mantenimiento" className="grid gap-4 lg:grid-cols-2 xl:grid-cols-12">
        <Card className="xl:col-span-6">
          <CardHeader
            title="Órdenes de mantenimiento por mes"
            description="Órdenes creadas en los últimos seis meses"
            action={
              <div className="flex items-center gap-3 text-[11px] text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm bg-teal-500" aria-hidden="true" />
                  Preventivos
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm bg-amber-500" aria-hidden="true" />
                  Correctivos
                </span>
              </div>
            }
          />
          <div className="px-3 pb-4 pt-2">
            <MonthlyOrdersChart orders={orders} />
          </div>
        </Card>

        <Card className="xl:col-span-3">
          <CardHeader title="Distribución por estado" description="Todas las órdenes" />
          <div className="px-5 pb-5 pt-3">
            <StatusDistributionChart orders={orders} />
          </div>
        </Card>

        <Card className="xl:col-span-3">
          <CardHeader title="Tipos de mantenimiento" description="Preventivo vs. correctivo" />
          <div className="px-5 pb-5 pt-4">
            <MaintenanceTypeChart orders={orders} />
          </div>
        </Card>
      </section>

      <section aria-label="Actividad y alertas" className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Actividad reciente"
            description="Últimas órdenes registradas en la demostración"
            action={
              <Button variant="ghost" size="sm" onClick={() => navigate('/orders')}>
                Ver todas
              </Button>
            }
          />
          <RecentOrdersTable orders={orders} equipment={equipment} />
        </Card>

        <Card>
          <CardHeader
            title="Alertas de equipos"
            description="Incidencias y mantenimiento próximo"
            action={
              <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                Demo
              </span>
            }
          />
          <EquipmentAlerts equipment={equipment} />
        </Card>
      </section>

      <OrderFormModal
        open={orderModalOpen}
        onClose={() => setOrderModalOpen(false)}
        onCreated={(order) => navigate(`/orders/${order.id}`)}
      />
    </div>
  )
}
