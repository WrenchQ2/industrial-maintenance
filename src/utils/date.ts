const dateFormatter = new Intl.DateTimeFormat('es-MX', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const shortDateFormatter = new Intl.DateTimeFormat('es-MX', {
  day: '2-digit',
  month: 'short',
})

const dateTimeFormatter = new Intl.DateTimeFormat('es-MX', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

/** Convierte un ISO YYYY-MM-DD (o ISO completo) a una fecha local. */
export function parseDate(value: string): Date {
  if (value.length === 10) {
    const [year, month, day] = value.split('-').map(Number)
    return new Date(year, month - 1, day)
  }
  return new Date(value)
}

export function formatDate(value: string): string {
  if (!value) return '—'
  return dateFormatter.format(parseDate(value))
}

export function formatShortDate(value: string): string {
  if (!value) return '—'
  return shortDateFormatter.format(parseDate(value))
}

export function formatDateTime(value: string): string {
  if (!value) return '—'
  return dateTimeFormatter.format(parseDate(value))
}

export function toDateInputValue(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function todayInputValue(): string {
  return toDateInputValue(new Date())
}

/** Días transcurridos desde una fecha hasta hoy. */
export function daysSince(value: string): number {
  const start = parseDate(value)
  const end = new Date()
  start.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 86_400_000))
}

export function isSameMonth(value: string, reference: Date): boolean {
  const date = parseDate(value)
  return date.getFullYear() === reference.getFullYear() && date.getMonth() === reference.getMonth()
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}
