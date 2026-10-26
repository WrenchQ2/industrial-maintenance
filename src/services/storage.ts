export const STORAGE_KEYS = {
  equipment: 'imai.demo.equipment.v1',
  orders: 'imai.demo.orders.v1',
  reports: 'imai.demo.reports.v1',
  notifications: 'imai.demo.notifications.v1',
  settings: 'imai.demo.settings.v1',
} as const

export function readStoredList<T>(key: string, fallback: T[]): T[] {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as T[]) : fallback
  } catch {
    return fallback
  }
}

export function writeStoredList<T>(key: string, value: T[]): void {
  localStorage.setItem(key, JSON.stringify(value))
}

export function readStoredValue<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function writeStoredValue<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value))
}

/** Pequeña espera para que la interfaz muestre estados de carga como lo hará con FastAPI. */
export function simulateLatency(milliseconds = 300): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds)
  })
}
