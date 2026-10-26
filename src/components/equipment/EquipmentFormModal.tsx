import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Save } from 'lucide-react'
import type { Equipment, EquipmentInput, EquipmentStatus, EquipmentType } from '../../types'
import { useAppData } from '../../context/AppDataContext'
import { useToast } from '../ui/Toast'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { FormField, SelectInput, TextArea, TextInput } from '../ui/FormControls'
import { todayInputValue } from '../../utils/date'

const equipmentTypes: EquipmentType[] = [
  'Servomotor',
  'Motor eléctrico',
  'Variador de frecuencia',
  'Robot industrial',
]

const equipmentStatuses: EquipmentStatus[] = [
  'Operativo',
  'En mantenimiento',
  'Con falla',
  'Fuera de servicio',
]

type FormErrors = Partial<Record<keyof EquipmentInput, string>>

function nextEquipmentCode(existing: Equipment[]): string {
  const highest = existing.reduce((max, item) => {
    const match = item.code.match(/(\d+)$/)
    return match ? Math.max(max, Number(match[1])) : max
  }, 0)
  return `EQ-${String(highest + 1).padStart(3, '0')}`
}

function emptyForm(existing: Equipment[]): EquipmentInput {
  return {
    code: nextEquipmentCode(existing),
    name: '',
    type: 'Servomotor',
    manufacturer: '',
    model: '',
    serialNumber: '',
    location: '',
    status: 'Operativo',
    lastMaintenanceDate: todayInputValue(),
    observations: '',
  }
}

function formFromEquipment(equipment: Equipment): EquipmentInput {
  return {
    code: equipment.code,
    name: equipment.name,
    type: equipment.type,
    manufacturer: equipment.manufacturer,
    model: equipment.model,
    serialNumber: equipment.serialNumber,
    location: equipment.location,
    status: equipment.status,
    lastMaintenanceDate: equipment.lastMaintenanceDate,
    observations: equipment.observations,
  }
}

interface EquipmentFormModalProps {
  open: boolean
  onClose: () => void
  equipment?: Equipment | null
}

export function EquipmentFormModal({ open, onClose, equipment }: EquipmentFormModalProps) {
  const { equipment: allEquipment, createEquipment, updateEquipment } = useAppData()
  const { showToast } = useToast()
  const isEditing = Boolean(equipment)
  const [form, setForm] = useState<EquipmentInput>(() => emptyForm(allEquipment))
  const [errors, setErrors] = useState<FormErrors>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm(equipment ? formFromEquipment(equipment) : emptyForm(allEquipment))
    setErrors({})
  }, [open, equipment, allEquipment])

  function update<K extends keyof EquipmentInput>(field: K, value: EquipmentInput[K]) {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  function validate(): boolean {
    const nextErrors: FormErrors = {}
    if (!form.code.trim()) nextErrors.code = 'El identificador es obligatorio.'
    if (!form.name.trim()) nextErrors.name = 'El nombre del equipo es obligatorio.'
    if (!form.manufacturer.trim()) nextErrors.manufacturer = 'Indica el fabricante.'
    if (!form.model.trim()) nextErrors.model = 'Indica el modelo.'
    if (!form.serialNumber.trim()) nextErrors.serialNumber = 'Indica el número de serie.'
    if (!form.location.trim()) nextErrors.location = 'Indica la ubicación.'
    if (!form.lastMaintenanceDate) nextErrors.lastMaintenanceDate = 'Selecciona una fecha.'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!validate()) return

    setSaving(true)
    try {
      const cleanForm: EquipmentInput = {
        ...form,
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        manufacturer: form.manufacturer.trim(),
        model: form.model.trim(),
        serialNumber: form.serialNumber.trim(),
        location: form.location.trim(),
        observations: form.observations.trim(),
      }

      if (equipment) {
        await updateEquipment(equipment.id, cleanForm)
        showToast(`Equipo ${cleanForm.code} actualizado correctamente.`)
      } else {
        await createEquipment(cleanForm)
        showToast(`Equipo ${cleanForm.code} registrado correctamente.`)
      }
      onClose()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo guardar el equipo.'
      setErrors((current) => ({ ...current, code: message }))
      showToast(message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!saving) onClose()
      }}
      title={isEditing ? 'Editar equipo' : 'Registrar equipo'}
      description={
        isEditing
          ? 'Actualiza la ficha técnica del equipo seleccionado.'
          : 'Añade un equipo al inventario de demostración. Los cambios se guardan en este navegador.'
      }
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="equipment-form" loading={saving}>
            {!saving && <Save className="h-4 w-4" aria-hidden="true" />}
            {isEditing ? 'Guardar cambios' : 'Guardar equipo'}
          </Button>
        </>
      }
    >
      <form id="equipment-form" onSubmit={(event) => void handleSubmit(event)} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Identificador" htmlFor="equipment-code" required error={errors.code}>
            <TextInput
              id="equipment-code"
              value={form.code}
              onChange={(event) => update('code', event.target.value)}
              placeholder="EQ-009"
              invalid={Boolean(errors.code)}
            />
          </FormField>

          <FormField label="Estado operativo" htmlFor="equipment-status" required>
            <SelectInput
              id="equipment-status"
              value={form.status}
              onChange={(event) => update('status', event.target.value as EquipmentStatus)}
            >
              {equipmentStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </SelectInput>
          </FormField>

          <FormField
            label="Nombre del equipo"
            htmlFor="equipment-name"
            required
            error={errors.name}
            className="sm:col-span-2"
          >
            <TextInput
              id="equipment-name"
              value={form.name}
              onChange={(event) => update('name', event.target.value)}
              placeholder="Servomotor de husillo principal"
              invalid={Boolean(errors.name)}
            />
          </FormField>

          <FormField label="Tipo de equipo" htmlFor="equipment-type" required>
            <SelectInput
              id="equipment-type"
              value={form.type}
              onChange={(event) => update('type', event.target.value as EquipmentType)}
            >
              {equipmentTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </SelectInput>
          </FormField>

          <FormField label="Fabricante" htmlFor="equipment-manufacturer" required error={errors.manufacturer}>
            <TextInput
              id="equipment-manufacturer"
              value={form.manufacturer}
              onChange={(event) => update('manufacturer', event.target.value)}
              placeholder="Siemens"
              invalid={Boolean(errors.manufacturer)}
            />
          </FormField>

          <FormField label="Modelo" htmlFor="equipment-model" required error={errors.model}>
            <TextInput
              id="equipment-model"
              value={form.model}
              onChange={(event) => update('model', event.target.value)}
              placeholder="1FK7083-5AF71"
              invalid={Boolean(errors.model)}
            />
          </FormField>

          <FormField
            label="Número de serie"
            htmlFor="equipment-serial"
            required
            error={errors.serialNumber}
          >
            <TextInput
              id="equipment-serial"
              value={form.serialNumber}
              onChange={(event) => update('serialNumber', event.target.value)}
              placeholder="SN-SIE-00001"
              invalid={Boolean(errors.serialNumber)}
            />
          </FormField>

          <FormField label="Ubicación" htmlFor="equipment-location" required error={errors.location}>
            <TextInput
              id="equipment-location"
              value={form.location}
              onChange={(event) => update('location', event.target.value)}
              placeholder="Planta A · Línea 01"
              invalid={Boolean(errors.location)}
            />
          </FormField>

          <FormField
            label="Último mantenimiento"
            htmlFor="equipment-last-maintenance"
            required
            error={errors.lastMaintenanceDate}
          >
            <TextInput
              id="equipment-last-maintenance"
              type="date"
              value={form.lastMaintenanceDate}
              onChange={(event) => update('lastMaintenanceDate', event.target.value)}
              invalid={Boolean(errors.lastMaintenanceDate)}
            />
          </FormField>

          <FormField
            label="Observaciones técnicas"
            htmlFor="equipment-observations"
            className="sm:col-span-2"
            hint="Opcional. Notas de inspección, restricciones o cuidados especiales."
          >
            <TextArea
              id="equipment-observations"
              rows={3}
              value={form.observations}
              onChange={(event) => update('observations', event.target.value)}
              placeholder="Información relevante para futuras intervenciones..."
            />
          </FormField>
        </div>
      </form>
    </Modal>
  )
}
