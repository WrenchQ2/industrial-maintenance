import type { AppSettings } from '../types'
import { defaultSettings, getDemoData } from '../data/demoData'
import {
  readStoredValue,
  STORAGE_KEYS,
  writeStoredList,
  writeStoredValue,
} from './storage'

export const settingsService = {
  get(): AppSettings {
    return readStoredValue<AppSettings>(STORAGE_KEYS.settings, defaultSettings)
  },

  save(settings: AppSettings): void {
    writeStoredValue(STORAGE_KEYS.settings, settings)
  },
}

/** Vuelve a dejar los datos de demostración originales en localStorage. */
export function resetDemoStorage(): void {
  const demo = getDemoData()
  writeStoredList(STORAGE_KEYS.equipment, demo.equipment)
  writeStoredList(STORAGE_KEYS.orders, demo.orders)
  writeStoredList(STORAGE_KEYS.reports, demo.reports)
  writeStoredList(STORAGE_KEYS.notifications, demo.notifications)
  writeStoredValue(STORAGE_KEYS.settings, defaultSettings)
}
