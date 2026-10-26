import {
  Bot,
  Boxes,
  ClipboardList,
  FileText,
  History,
  LayoutDashboard,
  Settings,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavigationItem {
  label: string
  shortLabel: string
  path: string
  icon: LucideIcon
  description: string
}

export const navigationItems: NavigationItem[] = [
  {
    label: 'Dashboard',
    shortLabel: 'Inicio',
    path: '/',
    icon: LayoutDashboard,
    description: 'Resumen operativo',
  },
  {
    label: 'Equipos',
    shortLabel: 'Equipos',
    path: '/equipment',
    icon: Boxes,
    description: 'Inventario industrial',
  },
  {
    label: 'Órdenes de mantenimiento',
    shortLabel: 'Órdenes',
    path: '/orders',
    icon: ClipboardList,
    description: 'Trabajo planificado',
  },
  {
    label: 'Historial de mantenimiento',
    shortLabel: 'Historial',
    path: '/history',
    icon: History,
    description: 'Intervenciones cerradas',
  },
  {
    label: 'Reportes técnicos',
    shortLabel: 'Reportes',
    path: '/reports',
    icon: FileText,
    description: 'Documentación técnica',
  },
  {
    label: 'Asistente de IA',
    shortLabel: 'Asistente IA',
    path: '/assistant',
    icon: Bot,
    description: 'Apoyo técnico simulado',
  },
  {
    label: 'Configuración',
    shortLabel: 'Configuración',
    path: '/settings',
    icon: Settings,
    description: 'Preferencias locales',
  },
]

export function getPageTitle(pathname: string): string {
  if (pathname === '/') return 'Dashboard'
  if (pathname.startsWith('/equipment/')) return 'Detalle de equipo'
  if (pathname.startsWith('/equipment')) return 'Equipos'
  if (pathname.startsWith('/orders/')) return 'Detalle de orden'
  if (pathname.startsWith('/orders')) return 'Órdenes de mantenimiento'
  if (pathname.startsWith('/history')) return 'Historial de mantenimiento'
  if (pathname.startsWith('/reports')) return 'Reportes técnicos'
  if (pathname.startsWith('/assistant')) return 'Asistente de IA'
  if (pathname.startsWith('/settings')) return 'Configuración'
  return 'Industrial Maintenance AI'
}
