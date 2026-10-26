export type EquipmentType =
  | 'Servomotor'
  | 'Motor eléctrico'
  | 'Variador de frecuencia'
  | 'Robot industrial'

export type EquipmentStatus =
  | 'Operativo'
  | 'En mantenimiento'
  | 'Con falla'
  | 'Fuera de servicio'

export type MaintenanceType = 'Preventivo' | 'Correctivo'

export type MaintenancePriority = 'Alta' | 'Media' | 'Baja'

export type MaintenanceOrderStatus =
  | 'Pendiente'
  | 'En progreso'
  | 'Completada'
  | 'Cancelada'

export type ReportStatus = 'Borrador' | 'En revisión' | 'Aprobado'

export type NotificationKind = 'critical' | 'warning' | 'info'

export interface Equipment {
  id: string
  code: string
  name: string
  type: EquipmentType
  manufacturer: string
  model: string
  serialNumber: string
  location: string
  status: EquipmentStatus
  lastMaintenanceDate: string
  observations: string
}

export interface MaintenanceOrder {
  id: string
  folio: string
  equipmentId: string
  description: string
  type: MaintenanceType
  priority: MaintenancePriority
  technician: string
  createdAt: string
  scheduledDate: string
  completedAt: string | null
  status: MaintenanceOrderStatus
}

export interface MaintenanceReport {
  id: string
  folio: string
  equipmentId: string
  date: string
  status: ReportStatus
  diagnosis: string
  activities: string
  results: string
  recommendations: string
  technician: string
}

export interface Notification {
  id: string
  title: string
  message: string
  date: string
  read: boolean
  kind: NotificationKind
}

/** Datos que introduce el formulario de alta de equipos. */
export type EquipmentInput = Omit<Equipment, 'id'>

/** Datos que introduce el formulario de nueva orden. */
export type MaintenanceOrderInput = Omit<
  MaintenanceOrder,
  'id' | 'folio' | 'createdAt' | 'completedAt' | 'status'
>

/** Datos que introduce el formulario de borrador de reporte. */
export type MaintenanceReportInput = Omit<
  MaintenanceReport,
  'id' | 'folio' | 'status' | 'technician'
>

export interface AppSettings {
  technicianName: string
  notificationsEnabled: boolean
}

export type AssistantRole = 'user' | 'assistant'

export interface AssistantMessage {
  id: string
  role: AssistantRole
  content: string
  createdAt: string
}
