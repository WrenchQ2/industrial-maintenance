import { FlaskConical } from 'lucide-react'
import { cn } from '../../utils/cn'

interface DemoNoticeProps {
  className?: string
  label?: string
}

export function DemoNotice({
  className,
  label = 'Entorno de demostración · datos ficticios guardados en este navegador',
}: DemoNoticeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-lg border border-amber-200/80 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800',
        className,
      )}
    >
      <FlaskConical className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}
