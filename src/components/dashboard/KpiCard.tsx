import type { LucideIcon } from 'lucide-react'
import { cn } from '../../utils/cn'
import { Card } from '../ui/Card'

type KpiTone = 'navy' | 'teal' | 'red' | 'amber' | 'green'

interface KpiCardProps {
  label: string
  value: string
  caption: string
  icon: LucideIcon
  tone?: KpiTone
}

const tones: Record<KpiTone, { icon: string; bar: string }> = {
  navy: { icon: 'bg-navy-50 text-navy-700', bar: 'bg-navy-600' },
  teal: { icon: 'bg-teal-50 text-teal-700', bar: 'bg-teal-500' },
  red: { icon: 'bg-red-50 text-red-600', bar: 'bg-red-500' },
  amber: { icon: 'bg-amber-50 text-amber-600', bar: 'bg-amber-500' },
  green: { icon: 'bg-emerald-50 text-emerald-600', bar: 'bg-emerald-500' },
}

export function KpiCard({ label, value, caption, icon: Icon, tone = 'navy' }: KpiCardProps) {
  return (
    <Card className="relative overflow-hidden p-5">
      <span className={cn('absolute inset-x-0 top-0 h-0.5', tones[tone].bar)} aria-hidden="true" />
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span
          className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', tones[tone].icon)}
        >
          <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{caption}</p>
    </Card>
  )
}
