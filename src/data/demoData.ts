import type {
  AppSettings,
  Equipment,
  MaintenanceOrder,
  MaintenanceReport,
  Notification,
} from '../types'

/** Devuelve una fecha local en formato YYYY-MM-DD. */
function toDateValue(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function daysAgo(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return toDateValue(date)
}

function monthDate(monthsAgo: number, day: number): string {
  const today = new Date()
  return toDateValue(new Date(today.getFullYear(), today.getMonth() - monthsAgo, day))
}

function dateTime(date: string, time = '09:30'): string {
  return `${date}T${time}:00`
}

const today = new Date()
const currentYear = today.getFullYear()

export const demoEquipment: Equipment[] = [
  {
    id: 'eq-1',
    code: 'EQ-001',
    name: 'Servomotor de husillo principal',
    type: 'Servomotor',
    manufacturer: 'Siemens',
    model: '1FK7083-5AF71-1AG0',
    serialNumber: 'SN-SIE-88421',
    location: 'Planta A · CNC-01',
    status: 'Operativo',
    lastMaintenanceDate: daysAgo(38),
    observations:
      'Equipo crítico para el mecanizado. Mantener limpio el sistema de refrigeración y revisar el encoder en cada parada programada.',
  },
  {
    id: 'eq-2',
    code: 'EQ-002',
    name: 'Variador de línea de extrusión',
    type: 'Variador de frecuencia',
    manufacturer: 'ABB',
    model: 'ACS880-01-145A-3',
    serialNumber: 'SN-ABB-77109',
    location: 'Planta A · Extrusión',
    status: 'Operativo',
    lastMaintenanceDate: daysAgo(57),
    observations:
      'Revisar limpieza de disipadores y apriete de bornes durante el próximo mantenimiento preventivo.',
  },
  {
    id: 'eq-3',
    code: 'EQ-003',
    name: 'Robot de soldadura',
    type: 'Robot industrial',
    manufacturer: 'KUKA',
    model: 'KR 16 R2010',
    serialNumber: 'SN-KUK-33018',
    location: 'Planta B · Celda de soldadura',
    status: 'En mantenimiento',
    lastMaintenanceDate: daysAgo(106),
    observations:
      'Presenta holgura en el eje 4. La celda permanece bloqueada hasta completar la inspección y el ajuste.',
  },
  {
    id: 'eq-4',
    code: 'EQ-004',
    name: 'Motor de bomba centrífuga',
    type: 'Motor eléctrico',
    manufacturer: 'WEG',
    model: 'W22 IE3 15 kW',
    serialNumber: 'SN-WEG-10935',
    location: 'Planta B · Sala de bombas',
    status: 'Operativo',
    lastMaintenanceDate: daysAgo(9),
    observations: 'Sin observaciones pendientes. Vibración dentro de los valores de referencia.',
  },
  {
    id: 'eq-5',
    code: 'EQ-005',
    name: 'Servomotor del eje X',
    type: 'Servomotor',
    manufacturer: 'Allen-Bradley',
    model: 'MPL-B330P-MJ72AA',
    serialNumber: 'SN-AB-55207',
    location: 'Planta A · Centro de mecanizado 02',
    status: 'Con falla',
    lastMaintenanceDate: daysAgo(159),
    observations:
      'Alarma intermitente de seguimiento. No reiniciar el equipo hasta revisar cableado y acoplamiento del encoder.',
  },
  {
    id: 'eq-6',
    code: 'EQ-006',
    name: 'Variador de compresor',
    type: 'Variador de frecuencia',
    manufacturer: 'Schneider Electric',
    model: 'ATV630U75N4',
    serialNumber: 'SN-SCH-40774',
    location: 'Planta C · Sala de compresores',
    status: 'Fuera de servicio',
    lastMaintenanceDate: daysAgo(198),
    observations:
      'Equipo fuera de servicio a la espera de repuesto de tarjeta de potencia. Confirmar disponibilidad con almacén.',
  },
  {
    id: 'eq-7',
    code: 'EQ-007',
    name: 'Robot de paletizado',
    type: 'Robot industrial',
    manufacturer: 'FANUC',
    model: 'M-10iD/12',
    serialNumber: 'SN-FAN-90281',
    location: 'Planta C · Línea de paletizado',
    status: 'Operativo',
    lastMaintenanceDate: daysAgo(51),
    observations:
      'Verificar el estado de las baterías del encoder y la lubricación de los ejes según el plan anual.',
  },
  {
    id: 'eq-8',
    code: 'EQ-008',
    name: 'Motor de ventilador de extracción',
    type: 'Motor eléctrico',
    manufacturer: 'Siemens',
    model: '1LE1 132S 5,5 kW',
    serialNumber: 'SN-SIE-66142',
    location: 'Planta B · Extracción general',
    status: 'Operativo',
    lastMaintenanceDate: daysAgo(14),
    observations: 'Limpieza de filtros realizada. Revisar tensión de correa en la próxima ronda.',
  },
]

export const demoOrders: MaintenanceOrder[] = [
  {
    id: 'ord-1',
    folio: `OM-${currentYear}-001`,
    equipmentId: 'eq-4',
    description:
      'Mantenimiento preventivo de bomba centrífuga: inspección de rodamientos, alineación y estado de conexiones.',
    type: 'Preventivo',
    priority: 'Baja',
    technician: 'Laura Méndez',
    createdAt: dateTime(daysAgo(7), '08:10'),
    scheduledDate: daysAgo(2),
    completedAt: dateTime(daysAgo(2), '15:40'),
    status: 'Completada',
  },
  {
    id: 'ord-2',
    folio: `OM-${currentYear}-002`,
    equipmentId: 'eq-7',
    description:
      'Revisión preventiva de robot de paletizado: lubricación de ejes 1 a 6 y comprobación de topes mecánicos.',
    type: 'Preventivo',
    priority: 'Media',
    technician: 'Carlos Ortega',
    createdAt: dateTime(daysAgo(12), '10:05'),
    scheduledDate: daysAgo(9),
    completedAt: dateTime(daysAgo(9), '12:25'),
    status: 'Completada',
  },
  {
    id: 'ord-3',
    folio: `OM-${currentYear}-003`,
    equipmentId: 'eq-3',
    description:
      'Diagnóstico de holgura en eje 4 del robot de soldadura. Revisar reductor, correas y juego mecánico.',
    type: 'Correctivo',
    priority: 'Alta',
    technician: 'Miguel Ángel Ruiz',
    createdAt: dateTime(daysAgo(3), '07:45'),
    scheduledDate: daysAgo(-1),
    completedAt: null,
    status: 'En progreso',
  },
  {
    id: 'ord-4',
    folio: `OM-${currentYear}-004`,
    equipmentId: 'eq-5',
    description:
      'Alarma intermitente de seguimiento en servomotor del eje X. Revisar cableado de encoder y acoplamiento.',
    type: 'Correctivo',
    priority: 'Alta',
    technician: 'Ana Torres',
    createdAt: dateTime(daysAgo(1), '16:20'),
    scheduledDate: daysAgo(-2),
    completedAt: null,
    status: 'Pendiente',
  },
  {
    id: 'ord-5',
    folio: `OM-${currentYear}-005`,
    equipmentId: 'eq-2',
    description:
      'Limpieza de disipadores y revisión de ventiladores del variador de la línea de extrusión.',
    type: 'Preventivo',
    priority: 'Media',
    technician: 'Laura Méndez',
    createdAt: dateTime(daysAgo(5), '11:35'),
    scheduledDate: daysAgo(-4),
    completedAt: null,
    status: 'Pendiente',
  },
  {
    id: 'ord-6',
    folio: `OM-${currentYear}-006`,
    equipmentId: 'eq-1',
    description:
      'Inspección preventiva del servomotor de husillo: estado del encoder, refrigeración y fijaciones.',
    type: 'Preventivo',
    priority: 'Media',
    technician: 'Carlos Ortega',
    createdAt: dateTime(monthDate(1, 6), '09:20'),
    scheduledDate: monthDate(1, 12),
    completedAt: dateTime(monthDate(1, 12), '14:10'),
    status: 'Completada',
  },
  {
    id: 'ord-7',
    folio: `OM-${currentYear}-007`,
    equipmentId: 'eq-8',
    description: 'Sustitución de correa y ajuste de tensión en motor de ventilador de extracción.',
    type: 'Correctivo',
    priority: 'Baja',
    technician: 'Miguel Ángel Ruiz',
    createdAt: dateTime(monthDate(1, 18), '13:00'),
    scheduledDate: monthDate(1, 21),
    completedAt: dateTime(monthDate(1, 21), '16:45'),
    status: 'Completada',
  },
  {
    id: 'ord-8',
    folio: `OM-${currentYear}-008`,
    equipmentId: 'eq-6',
    description:
      'Diagnóstico de falla de tarjeta de potencia en variador de compresor. Solicitud de repuesto.',
    type: 'Correctivo',
    priority: 'Alta',
    technician: 'Ana Torres',
    createdAt: dateTime(monthDate(2, 8), '08:30'),
    scheduledDate: monthDate(2, 9),
    completedAt: dateTime(monthDate(2, 11), '17:20'),
    status: 'Completada',
  },
  {
    id: 'ord-9',
    folio: `OM-${currentYear}-009`,
    equipmentId: 'eq-4',
    description: 'Revisión preventiva de acoplamiento y alineación de motor de bomba.',
    type: 'Preventivo',
    priority: 'Media',
    technician: 'Laura Méndez',
    createdAt: dateTime(monthDate(2, 19), '10:15'),
    scheduledDate: monthDate(2, 26),
    completedAt: null,
    status: 'Cancelada',
  },
  {
    id: 'ord-10',
    folio: `OM-${currentYear}-010`,
    equipmentId: 'eq-7',
    description: 'Lubricación general y revisión de cables de alimentación del robot de paletizado.',
    type: 'Preventivo',
    priority: 'Baja',
    technician: 'Carlos Ortega',
    createdAt: dateTime(monthDate(3, 4), '09:00'),
    scheduledDate: monthDate(3, 11),
    completedAt: dateTime(monthDate(3, 11), '13:30'),
    status: 'Completada',
  },
  {
    id: 'ord-11',
    folio: `OM-${currentYear}-011`,
    equipmentId: 'eq-1',
    description: 'Ajuste de parámetros y revisión de cable de encoder del servomotor de husillo.',
    type: 'Correctivo',
    priority: 'Media',
    technician: 'Ana Torres',
    createdAt: dateTime(monthDate(4, 14), '15:40'),
    scheduledDate: monthDate(4, 17),
    completedAt: dateTime(monthDate(4, 17), '18:05'),
    status: 'Completada',
  },
  {
    id: 'ord-12',
    folio: `OM-${currentYear}-012`,
    equipmentId: 'eq-3',
    description: 'Inspección anual de seguridad y lubricación del robot de soldadura.',
    type: 'Preventivo',
    priority: 'Alta',
    technician: 'Miguel Ángel Ruiz',
    createdAt: dateTime(monthDate(5, 3), '08:45'),
    scheduledDate: monthDate(5, 9),
    completedAt: dateTime(monthDate(5, 9), '15:15'),
    status: 'Completada',
  },
  {
    id: 'ord-13',
    folio: `OM-${currentYear}-013`,
    equipmentId: 'eq-5',
    description: 'Revisión del acoplamiento y sustitución de cable de señal del servomotor del eje X.',
    type: 'Correctivo',
    priority: 'Media',
    technician: 'Carlos Ortega',
    createdAt: dateTime(monthDate(5, 20), '12:00'),
    scheduledDate: monthDate(5, 24),
    completedAt: dateTime(monthDate(5, 24), '16:10'),
    status: 'Completada',
  },
]

export const demoReports: MaintenanceReport[] = [
  {
    id: 'rep-1',
    folio: `RT-${currentYear}-001`,
    equipmentId: 'eq-1',
    date: daysAgo(12),
    status: 'Aprobado',
    diagnosis: 'Desgaste leve en el acoplamiento y acumulación de polvo en el sistema de refrigeración.',
    activities:
      'Limpieza del ventilador y carcasa, inspección del encoder, comprobación de fijaciones y registro de parámetros.',
    results: 'Equipo operativo. Vibración y temperatura dentro de los valores de referencia del fabricante.',
    recommendations: 'Revisar el acoplamiento en la próxima parada programada y mantener limpio el flujo de aire.',
    technician: 'Carlos Ortega',
  },
  {
    id: 'rep-2',
    folio: `RT-${currentYear}-002`,
    equipmentId: 'eq-3',
    date: daysAgo(2),
    status: 'Borrador',
    diagnosis: 'Holgura detectada en el eje 4 del robot. Pendiente de confirmar origen en el reductor.',
    activities: 'Inspección visual, medición de juego mecánico y revisión de la lubricación del eje 4.',
    results: 'Pendiente de completar la medición con el equipo bloqueado y sin carga.',
    recommendations: 'No operar la celda hasta finalizar el diagnóstico y validar la reparación.',
    technician: 'Laura Méndez',
  },
  {
    id: 'rep-3',
    folio: `RT-${currentYear}-003`,
    equipmentId: 'eq-6',
    date: daysAgo(40),
    status: 'En revisión',
    diagnosis: 'Falla en tarjeta de potencia del variador. El equipo no responde al comando de marcha.',
    activities: 'Lectura de alarmas, revisión de alimentación, inspección visual de la tarjeta y solicitud de repuesto.',
    results: 'Equipo fuera de servicio a la espera de sustitución de la tarjeta de potencia.',
    recommendations: 'Verificar la calidad de alimentación al reinstalar y validar parámetros antes del arranque.',
    technician: 'Ana Torres',
  },
  {
    id: 'rep-4',
    folio: `RT-${currentYear}-004`,
    equipmentId: 'eq-4',
    date: daysAgo(65),
    status: 'Aprobado',
    diagnosis: 'Desalineación menor entre motor y bomba. Sin falla funcional asociada.',
    activities: 'Alineación con reloj comparador, revisión de rodamientos y ajuste de pernos de anclaje.',
    results: 'Nivel de vibración reducido. Equipo devuelto a operación normal.',
    recommendations: 'Realizar seguimiento de vibración a las 200 horas de operación.',
    technician: 'Laura Méndez',
  },
]

export const demoNotifications: Notification[] = [
  {
    id: 'not-1',
    title: 'Equipo con falla crítica',
    message: 'El servomotor EQ-005 del eje X requiere atención. Hay una orden prioritaria asociada.',
    date: dateTime(daysAgo(0), '07:55'),
    read: false,
    kind: 'critical',
  },
  {
    id: 'not-2',
    title: 'Mantenimiento próximo',
    message: 'El robot EQ-003 supera los 100 días desde su último mantenimiento.',
    date: dateTime(daysAgo(1), '16:20'),
    read: false,
    kind: 'warning',
  },
  {
    id: 'not-3',
    title: 'Reporte en revisión',
    message: 'El reporte RT-' + currentYear + '-003 está pendiente de validación técnica.',
    date: dateTime(daysAgo(2), '11:05'),
    read: false,
    kind: 'info',
  },
  {
    id: 'not-4',
    title: 'Orden completada',
    message: 'La orden preventiva del robot de paletizado se completó correctamente.',
    date: dateTime(daysAgo(9), '12:30'),
    read: true,
    kind: 'info',
  },
]

export const defaultSettings: AppSettings = {
  technicianName: 'Juan Pablo Robledo',
  notificationsEnabled: true,
}

/** Devuelve una copia nueva para poder reiniciar la demo sin mutar los originales. */
export function getDemoData() {
  return {
    equipment: demoEquipment.map((item) => ({ ...item })),
    orders: demoOrders.map((item) => ({ ...item })),
    reports: demoReports.map((item) => ({ ...item })),
    notifications: demoNotifications.map((item) => ({ ...item })),
  }
}
