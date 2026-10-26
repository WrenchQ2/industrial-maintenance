import type { Equipment, EquipmentInput } from '../types'
import { getDemoData } from '../data/demoData'
import { readStoredList, simulateLatency, STORAGE_KEYS, writeStoredList } from './storage'

function readEquipment(): Equipment[] {
  return readStoredList<Equipment>(STORAGE_KEYS.equipment, getDemoData().equipment)
}

function assertUnique(input: EquipmentInput, current: Equipment[], editingId?: string): void {
  const duplicateCode = current.some(
    (item) => item.id !== editingId && item.code.toLowerCase() === input.code.trim().toLowerCase(),
  )
  const duplicateSerial = current.some(
    (item) =>
      item.id !== editingId &&
      item.serialNumber.trim().toLowerCase() === input.serialNumber.trim().toLowerCase(),
  )

  if (duplicateCode) throw new Error('Ya existe un equipo con ese identificador.')
  if (duplicateSerial) throw new Error('Ya existe un equipo con ese número de serie.')
}

/**
 * Capa de acceso a datos de equipos.
 * Hoy usa localStorage; en el futuro estos métodos podrán llamar a FastAPI
 * sin cambiar los componentes visuales.
 */
export const equipmentService = {
  async list(): Promise<Equipment[]> {
    await simulateLatency(250)
    return readEquipment()
  },

  async create(input: EquipmentInput): Promise<Equipment> {
    await simulateLatency(350)
    const equipment = readEquipment()
    assertUnique(input, equipment)
    const newEquipment: Equipment = { ...input, id: crypto.randomUUID() }
    writeStoredList(STORAGE_KEYS.equipment, [newEquipment, ...equipment])
    return newEquipment
  },

  async update(id: string, input: EquipmentInput): Promise<Equipment> {
    await simulateLatency(350)
    const equipment = readEquipment()
    assertUnique(input, equipment, id)
    const exists = equipment.some((item) => item.id === id)
    if (!exists) throw new Error('El equipo ya no existe.')

    const updated: Equipment = { ...input, id }
    writeStoredList(
      STORAGE_KEYS.equipment,
      equipment.map((item) => (item.id === id ? updated : item)),
    )
    return updated
  },

  async remove(id: string): Promise<void> {
    await simulateLatency(300)
    const equipment = readEquipment()
    writeStoredList(
      STORAGE_KEYS.equipment,
      equipment.filter((item) => item.id !== id),
    )
  },
}
