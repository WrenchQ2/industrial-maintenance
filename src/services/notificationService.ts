import type { Notification } from '../types'
import { getDemoData } from '../data/demoData'
import { readStoredList, simulateLatency, STORAGE_KEYS, writeStoredList } from './storage'

function readNotifications(): Notification[] {
  return readStoredList<Notification>(STORAGE_KEYS.notifications, getDemoData().notifications)
}

export const notificationService = {
  async list(): Promise<Notification[]> {
    await simulateLatency(250)
    return readNotifications()
  },

  async markAsRead(id: string): Promise<Notification[]> {
    const notifications = readNotifications().map((item) =>
      item.id === id ? { ...item, read: true } : item,
    )
    writeStoredList(STORAGE_KEYS.notifications, notifications)
    return notifications
  },

  async markAllAsRead(): Promise<Notification[]> {
    const notifications = readNotifications().map((item) => ({ ...item, read: true }))
    writeStoredList(STORAGE_KEYS.notifications, notifications)
    return notifications
  },
}
