import type {
  EquipmentStatus,
  EquipmentType,
  MaintenanceOrderStatus,
  MaintenancePriority,
  MaintenanceType,
  ReportStatus,
} from '../types'

export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'accent'

const equipmentStatusTones: Record<EquipmentStatus, BadgeTone> = {
  Operativo: 'success',
  'En mantenimiento': 'warning',
  'Con falla': 'danger',
  'Fuera de servicio': 'neutral',
}

const orderStatusTones: Record<MaintenanceOrderStatus, BadgeTone> = {
  Pendiente: 'warning',
  'En progreso': 'info',
  Completada: 'success',
  Cancelada: 'neutral',
}

const priorityTones: Record<MaintenancePriority, BadgeTone> = {
  Alta: 'danger',
  Media: 'warning',
  Baja: 'neutral',
}

const reportStatusTones: Record<ReportStatus, BadgeTone> = {
  Borrador: 'neutral',
  'En revisión': 'warning',
  Aprobado: 'success',
}

const maintenanceTypeTones: Record<MaintenanceType, BadgeTone> = {
  Preventivo: 'accent',
  Correctivo: 'warning',
}

const equipmentTypeTones: Record<EquipmentType, BadgeTone> = {
  Servomotor: 'info',
  'Motor eléctrico': 'neutral',
  'Variador de frecuencia': 'accent',
  'Robot industrial': 'info',
}

export const equipmentStatusTone = (status: EquipmentStatus) => equipmentStatusTones[status]
export const orderStatusTone = (status: MaintenanceOrderStatus) => orderStatusTones[status]
export const priorityTone = (priority: MaintenancePriority) => priorityTones[priority]
export const reportStatusTone = (status: ReportStatus) => reportStatusTones[status]
export const maintenanceTypeTone = (type: MaintenanceType) => maintenanceTypeTones[type]
export const equipmentTypeTone = (type: EquipmentType) => equipmentTypeTones[type]

/** Clases de color para las series y elementos de las gráficas. */
export const chartColors = {
  navy: '#133a5e',
  teal: '#0f9f8f',
  amber: '#d97706',
  red: '#dc2626',
  blue: '#3b82f6',
  slate: '#94a3b8',
  green: '#16a34a',
}
