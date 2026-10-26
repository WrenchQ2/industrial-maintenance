import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { ClipboardPlus, Save } from 'lucide-react'
import type {
  MaintenanceOrder,
  MaintenanceOrderInput,
  MaintenancePriority,
  MaintenanceType,
} from '../../types'
import { useAppData } from '../../context/AppDataContext'
import { useToast } from '../ui/Toast'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { FormField, SelectInput, TextArea, TextInput } from '../ui/FormControls'
import { todayInputValue } from '../../utils/date'

type FormErrors = Partial<Record<keyof MaintenanceOrderInput, string>>

interface OrderFormModalProps {
  open: boolean
  onClose: () => void
  initialEquipmentId?: string
  onCreated?: (order: MaintenanceOrder) => void
}

export function OrderFormModal({ open, onClose, initialEquipmentId, onCreated }: OrderFormModalProps) {
  const { equipment, settings, createOrder } = useAppData()
  const { showToast } = useToast()
  const [form, setForm] = useState<MaintenanceOrderInput>({
    equipmentId: '',
    description: '',
    type: 'Preventivo',
    priority: 'Media',
    technician: settings.technicianName,
    scheduledDate: todayInputValue(),
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    const selectedEquipment =
      initialEquipmentId && equipment.some((item) => item.id === initialEquipmentId)
        ? initialEquipmentId
        : (equipment[0]?.id ?? '')

    setForm({
      equipmentId: selectedEquipment,
      description: '',
      type: 'Preventivo',
      priority: 'Media',
      technician: settings.technicianName,
      scheduledDate: todayInputValue(),
    })
    setErrors({})
  }, [open, initialEquipmentId, equipment, settings.technicianName])

  function update<K extends keyof MaintenanceOrderInput>(
    field: K,
    value: MaintenanceOrderInput[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  function validate(): boolean {
    const nextErrors: FormErrors = {}
    if (!form.equipmentId) nextErrors.equipmentId = 'Selecciona un equipo.'
    if (form.description.trim().length < 10) {
      nextErrors.description = 'Describe el problema con al menos 10 caracteres.'
    }
    if (!form.technician.trim()) nextErrors.technician = 'Indica el técnico asignado.'
    if (!form.scheduledDate) nextErrors.scheduledDate = 'Selecciona una fecha programada.'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!validate()) return

    setSaving(true)
    try {
      const created = await createOrder({
        ...form,
        description: form.description.trim(),
        technician: form.technician.trim(),
      })
      showToast(`Orden ${created.folio} creada correctamente.`)
      onCreated?.(created)
      onClose()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo crear la orden.'
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
      title="Nueva orden de mantenimiento"
      description="La orden se guardará como Pendiente y podrás cambiar su estado desde el detalle."
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="order-form" loading={saving}>
            {!saving && <ClipboardPlus className="h-4 w-4" aria-hidden="true" />}
            Crear orden
          </Button>
        </>
      }
    >
      {equipment.length === 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          No hay equipos registrados. Registra primero un equipo para poder crear una orden.
        </div>
      ) : (
        <form id="order-form" onSubmit={(event) => void handleSubmit(event)} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Equipo"
              htmlFor="order-equipment"
              required
              error={errors.equipmentId}
              className="sm:col-span-2"
            >
              <SelectInput
                id="order-equipment"
                value={form.equipmentId}
                onChange={(event) => update('equipmentId', event.target.value)}
                invalid={Boolean(errors.equipmentId)}
              >
                {equipment.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.code} · {item.name}
                  </option>
                ))}
              </SelectInput>
            </FormField>

            <FormField
              label="Descripción del problema o trabajo"
              htmlFor="order-description"
              required
              error={errors.description}
              hint="Incluye la falla observada o las actividades previstas."
              className="sm:col-span-2"
            >
              <TextArea
                id="order-description"
                rows={3}
                value={form.description}
                onChange={(event) => update('description', event.target.value)}
                placeholder="Describe la incidencia, las comprobaciones realizadas y el objetivo de la orden..."
                invalid={Boolean(errors.description)}
              />
            </FormField>

            <FormField label="Tipo de mantenimiento" htmlFor="order-type" required>
              <SelectInput
                id="order-type"
                value={form.type}
                onChange={(event) => update('type', event.target.value as MaintenanceType)}
              >
                <option value="Preventivo">Preventivo</option>
                <option value="Correctivo">Correctivo</option>
              </SelectInput>
            </FormField>

            <FormField label="Prioridad" htmlFor="order-priority" required>
              <SelectInput
                id="order-priority"
                value={form.priority}
                onChange={(event) => update('priority', event.target.value as MaintenancePriority)}
              >
                <option value="Alta">Alta</option>
                <option value="Media">Media</option>
                <option value="Baja">Baja</option>
              </SelectInput>
            </FormField>

            <FormField
              label="Técnico asignado"
              htmlFor="order-technician"
              required
              error={errors.technician}
            >
              <TextInput
                id="order-technician"
                value={form.technician}
                onChange={(event) => update('technician', event.target.value)}
                placeholder="Nombre del técnico"
                invalid={Boolean(errors.technician)}
              />
            </FormField>

            <FormField
              label="Fecha programada"
              htmlFor="order-scheduled-date"
              required
              error={errors.scheduledDate}
            >
              <TextInput
                id="order-scheduled-date"
                type="date"
                value={form.scheduledDate}
                onChange={(event) => update('scheduledDate', event.target.value)}
                invalid={Boolean(errors.scheduledDate)}
              />
            </FormField>
          </div>

          <div className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-500">
            <Save className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            <p>
              Se generará un folio automático y la fecha de creación será la fecha actual. Los datos
              se guardan localmente como demostración.
            </p>
          </div>
        </form>
      )}
    </Modal>
  )
}
