import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { MaintenanceOrder } from '../../types'
import { parseDate } from '../../utils/date'

interface MonthlyData {
  month: string
  preventivos: number
  correctivos: number
}

export function MonthlyOrdersChart({ orders }: { orders: MaintenanceOrder[] }) {
  const data = useMemo<MonthlyData[]>(() => {
    const now = new Date()
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1)
      return {
        key: `${date.getFullYear()}-${date.getMonth()}`,
        label: new Intl.DateTimeFormat('es-MX', { month: 'short' })
          .format(date)
          .replace('.', ''),
        preventivos: 0,
        correctivos: 0,
      }
    })

    for (const order of orders) {
      const created = parseDate(order.createdAt)
      const key = `${created.getFullYear()}-${created.getMonth()}`
      const month = months.find((item) => item.key === key)
      if (!month) continue
      if (order.type === 'Preventivo') month.preventivos += 1
      else month.correctivos += 1
    }

    return months.map((month) => ({
      month: month.label.charAt(0).toUpperCase() + month.label.slice(1),
      preventivos: month.preventivos,
      correctivos: month.correctivos,
    }))
  }, [orders])

  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 8, left: -22, bottom: 0 }} barSize={18}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#64748b', fontSize: 12 }}
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
          />
          <Tooltip
            cursor={{ fill: '#f1f5f9' }}
            contentStyle={{
              borderRadius: 10,
              border: '1px solid #e2e8f0',
              boxShadow: '0 8px 20px rgba(15, 23, 42, 0.08)',
              fontSize: 12,
            }}
            labelStyle={{ color: '#0f172a', fontWeight: 600 }}
          />
          <Bar
            dataKey="preventivos"
            name="Preventivos"
            stackId="ordenes"
            fill="#0f9f8f"
            radius={[0, 0, 3, 3]}
            isAnimationActive={false}
          />
          <Bar
            dataKey="correctivos"
            name="Correctivos"
            stackId="ordenes"
            fill="#f59e0b"
            radius={[3, 3, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

const statusColors: Record<string, string> = {
  Pendiente: '#f59e0b',
  'En progreso': '#3b82f6',
  Completada: '#10b981',
  Cancelada: '#94a3b8',
}

const orderStatuses = ['Pendiente', 'En progreso', 'Completada', 'Cancelada'] as const

export function StatusDistributionChart({ orders }: { orders: MaintenanceOrder[] }) {
  const data = useMemo(() => {
    return orderStatuses
      .map((status) => ({
        name: status,
        value: orders.filter((order) => order.status === status).length,
      }))
      .filter((item) => item.value > 0)
  }, [orders])

  const total = orders.length

  if (total === 0) {
    return <ChartEmpty message="Aún no hay órdenes para distribuir." />
  }

  return (
    <div>
      <div className="relative h-[190px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={76}
              paddingAngle={2}
              stroke="#ffffff"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={statusColors[entry.name] ?? '#94a3b8'} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: 10,
                border: '1px solid #e2e8f0',
                fontSize: 12,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold text-slate-900">{total}</span>
          <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
            Órdenes
          </span>
        </div>
      </div>
      <ul className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1.5">
        {data.map((entry) => (
          <li key={entry.name} className="flex min-w-0 items-center gap-1.5 text-xs text-slate-600">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: statusColors[entry.name] }}
              aria-hidden="true"
            />
            <span className="truncate">{entry.name}</span>
            <span className="ml-auto font-semibold text-slate-800">{entry.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function MaintenanceTypeChart({ orders }: { orders: MaintenanceOrder[] }) {
  const data = useMemo(
    () => [
      {
        tipo: 'Preventivo',
        cantidad: orders.filter((order) => order.type === 'Preventivo').length,
      },
      {
        tipo: 'Correctivo',
        cantidad: orders.filter((order) => order.type === 'Correctivo').length,
      },
    ],
    [orders],
  )

  const total = data.reduce((sum, item) => sum + item.cantidad, 0)
  if (total === 0) return <ChartEmpty message="Aún no hay tipos de mantenimiento registrados." />

  return (
    <div className="flex h-full flex-col justify-center">
      <div className="space-y-5">
        {data.map((item) => {
          const percentage = Math.round((item.cantidad / total) * 100)
          return (
            <div key={item.tipo}>
              <div className="mb-1.5 flex items-baseline justify-between gap-3">
                <span className="text-xs font-medium text-slate-600">{item.tipo}</span>
                <span className="text-xs text-slate-500">
                  <strong className="text-sm font-semibold text-slate-900">{item.cantidad}</strong>{' '}
                  · {percentage}%
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${
                    item.tipo === 'Preventivo' ? 'bg-teal-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-6 rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-500">
        El mantenimiento preventivo representa el{' '}
        <strong className="font-semibold text-slate-700">
          {total > 0 ? Math.round((data[0].cantidad / total) * 100) : 0}%
        </strong>{' '}
        de las órdenes de demostración.
      </div>
    </div>
  )
}

function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="flex h-[260px] items-center justify-center px-4 text-center text-sm text-slate-500">
      {message}
    </div>
  )
}
