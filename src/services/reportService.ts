import type {
  MaintenanceReport,
  MaintenanceReportInput,
  ReportStatus,
} from '../types'
import { getDemoData, defaultSettings } from '../data/demoData'
import { nextFolio } from '../utils/folio'
import {
  readStoredList,
  readStoredValue,
  simulateLatency,
  STORAGE_KEYS,
  writeStoredList,
} from './storage'

function readReports(): MaintenanceReport[] {
  return readStoredList<MaintenanceReport>(STORAGE_KEYS.reports, getDemoData().reports)
}

/** Capa de acceso a datos de reportes técnicos. */
export const reportService = {
  async list(): Promise<MaintenanceReport[]> {
    await simulateLatency(250)
    return readReports()
  },

  async create(input: MaintenanceReportInput): Promise<MaintenanceReport> {
    await simulateLatency(350)
    const reports = readReports()
    const settings = readStoredValue(STORAGE_KEYS.settings, defaultSettings)
    const report: MaintenanceReport = {
      ...input,
      id: crypto.randomUUID(),
      folio: nextFolio(
        'RT',
        reports.map((item) => item.folio),
        new Date().getFullYear(),
      ),
      status: 'Borrador',
      technician: settings.technicianName,
    }
    writeStoredList(STORAGE_KEYS.reports, [report, ...reports])
    return report
  },

  async updateStatus(id: string, status: ReportStatus): Promise<MaintenanceReport> {
    await simulateLatency(300)
    const reports = readReports()
    const current = reports.find((item) => item.id === id)
    if (!current) throw new Error('El reporte ya no existe.')

    const updated: MaintenanceReport = { ...current, status }
    writeStoredList(
      STORAGE_KEYS.reports,
      reports.map((item) => (item.id === id ? updated : item)),
    )
    return updated
  },

  /** Se usa al eliminar un equipo para no dejar reportes huérfanos. */
  async removeByEquipment(equipmentId: string): Promise<void> {
    const reports = readReports()
    writeStoredList(
      STORAGE_KEYS.reports,
      reports.filter((item) => item.equipmentId !== equipmentId),
    )
  },
}
