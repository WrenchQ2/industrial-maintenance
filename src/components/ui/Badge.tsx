import type { ReactNode } from 'react'
import { cn } from '../../utils/cn'
import type { BadgeTone } from '../../utils/status'

const tones: Record<BadgeTone, string> = {
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  warning: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  danger: 'bg-red-50 text-red-700 ring-red-600/20',
  info: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  neutral: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  accent: 'bg-teal-50 text-teal-700 ring-teal-600/20',
}

const dots: Record<BadgeTone, string> = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  info: 'bg-sky-500',
  neutral: 'bg-slate-400',
  accent: 'bg-teal-500',
}

interface BadgeProps {
  tone?: BadgeTone
  children: ReactNode
  dot?: boolean
  className?: string
}

export function Badge({ tone = 'neutral', children, dot = false, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
        tones[tone],
        className,
      )}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', dots[tone])} aria-hidden="true" />}
      {children}
    </span>
  )
}
