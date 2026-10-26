import { getInitials } from '../../utils/date'
import { cn } from '../../utils/cn'

interface AvatarProps {
  name: string
  size?: 'sm' | 'md'
  className?: string
}

export function Avatar({ name, size = 'md', className }: AvatarProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-navy-800 font-semibold text-white ring-2 ring-white',
        size === 'sm' ? 'h-8 w-8 text-[11px]' : 'h-9 w-9 text-xs',
        className,
      )}
      aria-hidden="true"
    >
      {getInitials(name)}
    </span>
  )
}
