import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type {
  AppSettings,
  Equipment,
  EquipmentInput,
  MaintenanceOrder,
  MaintenanceOrderInput,
  MaintenanceOrderStatus,
  MaintenanceReport,
  MaintenanceReportInput,
  Notification,
  ReportStatus,
} from '../types'
import { equipmentService } from '../services/equipmentService'
import { orderService } from '../services/orderService'
import { reportService } from '../services/reportService'
import { notificationService } from '../services/notificationService'
import { resetDemoStorage, settingsService } from '../services/settingsService'
import { toDateInputValue } from '../utils/date'

interface AppDataContextValue {
  loading: boolean
  error: string | null
  equipment: Equipment[]
  orders: MaintenanceOrder[]
  reports: MaintenanceReport[]
  notifications: Notification[]
  settings: AppSettings
  createEquipment: (input: EquipmentInput) => Promise<Equipment>
  updateEquipment: (id: string, input: EquipmentInput) => Promise<Equipment>
  deleteEquipment: (id: string) => Promise<void>
  createOrder: (input: MaintenanceOrderInput) => Promise<MaintenanceOrder>
  updateOrderStatus: (id: string, status: MaintenanceOrderStatus) => Promise<MaintenanceOrder>
  createReport: (input: MaintenanceReportInput) => Promise<MaintenanceReport>
  updateReportStatus: (id: string, status: ReportStatus) => Promise<MaintenanceReport>
  markNotificationRead: (id: string) => Promise<void>
  markAllNotificationsRead: () => Promise<void>
  updateSettings: (settings: AppSettings) => void
  resetDemo: () => Promise<void>
}

const AppDataContext = createContext<AppDataContextValue | null>(null)

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [orders, setOrders] = useState<MaintenanceOrder[]>([])
  const [reports, setReports] = useState<MaintenanceReport[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [settings, setSettings] = useState<AppSettings>(() => settingsService.get())

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [nextEquipment, nextOrders, nextReports, nextNotifications] = await Promise.all([
        equipmentService.list(),
        orderService.list(),
        reportService.list(),
        notificationService.list(),
      ])
      setEquipment(nextEquipment)
      setOrders(nextOrders)
      setReports(nextReports)
      setNotifications(nextNotifications)
    } catch {
      setError('No se pudieron cargar los datos de demostración. Recarga la página para intentarlo de nuevo.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const createEquipment = useCallback(async (input: EquipmentInput) => {
    const created = await equipmentService.create(input)
    setEquipment((current) => [created, ...current])
    return created
  }, [])

  const updateEquipment = useCallback(async (id: string, input: EquipmentInput) => {
    const updated = await equipmentService.update(id, input)
    setEquipment((current) => current.map((item) => (item.id === id ? updated : item)))
    return updated
  }, [])

  const deleteEquipment = useCallback(async (id: string) => {
    await equipmentService.remove(id)
    await Promise.all([
      orderService.removeByEquipment(id),
      reportService.removeByEquipment(id),
    ])
    setEquipment((current) => current.filter((item) => item.id !== id))
    setOrders((current) => current.filter((item) => item.equipmentId !== id))
    setReports((current) => current.filter((item) => item.equipmentId !== id))
  }, [])

  const createOrder = useCallback(async (input: MaintenanceOrderInput) => {
    const created = await orderService.create(input)
    setOrders((current) => [created, ...current])
    return created
  }, [])

  const updateOrderStatus = useCallback(
    async (id: string, status: MaintenanceOrderStatus) => {
      const updated = await orderService.updateStatus(id, status)
      setOrders((current) => current.map((item) => (item.id === id ? updated : item)))
      if (status === 'Completada') {
        setEquipment((current) =>
          current.map((item) =>
            item.id === updated.equipmentId
              ? { ...item, lastMaintenanceDate: toDateInputValue(new Date()) }
              : item,
          ),
        )
      }
      return updated
    },
    [],
  )

  const createReport = useCallback(async (input: MaintenanceReportInput) => {
    const created = await reportService.create(input)
    setReports((current) => [created, ...current])
    return created
  }, [])

  const updateReportStatus = useCallback(async (id: string, status: ReportStatus) => {
    const updated = await reportService.updateStatus(id, status)
    setReports((current) => current.map((item) => (item.id === id ? updated : item)))
    return updated
  }, [])

  const markNotificationRead = useCallback(async (id: string) => {
    const updated = await notificationService.markAsRead(id)
    setNotifications(updated)
  }, [])

  const markAllNotificationsRead = useCallback(async () => {
    const updated = await notificationService.markAllAsRead()
    setNotifications(updated)
  }, [])

  const updateSettings = useCallback((nextSettings: AppSettings) => {
    settingsService.save(nextSettings)
    setSettings(nextSettings)
  }, [])

  const resetDemo = useCallback(async () => {
    resetDemoStorage()
    setSettings(settingsService.get())
    await loadData()
  }, [loadData])

  const value = useMemo<AppDataContextValue>(
    () => ({
      loading,
      error,
      equipment,
      orders,
      reports,
      notifications,
      settings,
      createEquipment,
      updateEquipment,
      deleteEquipment,
      createOrder,
      updateOrderStatus,
      createReport,
      updateReportStatus,
      markNotificationRead,
      markAllNotificationsRead,
      updateSettings,
      resetDemo,
    }),
    [
      loading,
      error,
      equipment,
      orders,
      reports,
      notifications,
      settings,
      createEquipment,
      updateEquipment,
      deleteEquipment,
      createOrder,
      updateOrderStatus,
      createReport,
      updateReportStatus,
      markNotificationRead,
      markAllNotificationsRead,
      updateSettings,
      resetDemo,
    ],
  )

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

export function useAppData(): AppDataContextValue {
  const context = useContext(AppDataContext)
  if (!context) throw new Error('useAppData debe usarse dentro de AppDataProvider')
  return context
}
