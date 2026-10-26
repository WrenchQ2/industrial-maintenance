import type {
  MaintenanceOrder,
  MaintenanceOrderInput,
  MaintenanceOrderStatus,
} from '../types'
import { getDemoData } from '../data/demoData'
import { nextFolio } from '../utils/folio'
import { toDateInputValue } from '../utils/date'
import { readStoredList, simulateLatency, STORAGE_KEYS, writeStoredList } from './storage'

function readOrders(): MaintenanceOrder[] {
  return readStoredList<MaintenanceOrder>(STORAGE_KEYS.orders, getDemoData().orders)
}

/** Capa de acceso a datos de órdenes de mantenimiento. */
export const orderService = {
  async list(): Promise<MaintenanceOrder[]> {
    await simulateLatency(250)
    return readOrders()
  },

  async create(input: MaintenanceOrderInput): Promise<MaintenanceOrder> {
    await simulateLatency(350)
    const orders = readOrders()
    const order: MaintenanceOrder = {
      ...input,
      id: crypto.randomUUID(),
      folio: nextFolio(
        'OM',
        orders.map((item) => item.folio),
        new Date().getFullYear(),
      ),
      status: 'Pendiente',
      createdAt: new Date().toISOString(),
      completedAt: null,
    }
    writeStoredList(STORAGE_KEYS.orders, [order, ...orders])
    return order
  },

  async updateStatus(id: string, status: MaintenanceOrderStatus): Promise<MaintenanceOrder> {
    await simulateLatency(300)
    const orders = readOrders()
    const current = orders.find((item) => item.id === id)
    if (!current) throw new Error('La orden ya no existe.')

    const updated: MaintenanceOrder = {
      ...current,
      status,
      completedAt: status === 'Completada' ? new Date().toISOString() : null,
    }
    writeStoredList(
      STORAGE_KEYS.orders,
      orders.map((item) => (item.id === id ? updated : item)),
    )

    // Al completar una orden, actualizamos la fecha de mantenimiento del equipo.
    if (status === 'Completada') {
      const equipment = readStoredList(
        STORAGE_KEYS.equipment,
        getDemoData().equipment,
      )
      writeStoredList(
        STORAGE_KEYS.equipment,
        equipment.map((item) =>
          item.id === updated.equipmentId
            ? { ...item, lastMaintenanceDate: toDateInputValue(new Date()) }
            : item,
        ),
      )
    }

    return updated
  },

  /** Se usa al eliminar un equipo para no dejar órdenes huérfanas. */
  async removeByEquipment(equipmentId: string): Promise<void> {
    const orders = readOrders()
    writeStoredList(
      STORAGE_KEYS.orders,
      orders.filter((item) => item.equipmentId !== equipmentId),
    )
  },
}
