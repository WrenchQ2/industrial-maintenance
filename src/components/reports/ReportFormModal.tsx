import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { FileImage, Save } from 'lucide-react'
import type { MaintenanceReportInput } from '../../types'
import { useAppData } from '../../context/AppDataContext'
import { useToast } from '../ui/Toast'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { FormField, SelectInput, TextArea, TextInput } from '../ui/FormControls'
import { todayInputValue } from '../../utils/date'

type FormErrors = Partial<Record<keyof MaintenanceReportInput, string>>

interface ReportFormModalProps {
  open: boolean
  onClose: () => void
}

export function ReportFormModal({ open, onClose }: ReportFormModalProps) {
  const { equipment, createReport } = useAppData()
  const { showToast } = useToast()
  const [form, setForm] = useState<MaintenanceReportInput>({
    equipmentId: '',
    date: todayInputValue(),
    diagnosis: '',
    activities: '',
    results: '',
    recommendations: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm({
      equipmentId: equipment[0]?.id ?? '',
      date: todayInputValue(),
      diagnosis: '',
      activities: '',
      results: '',
      recommendations: '',
    })
    setErrors({})
  }, [open, equipment])

  function update<K extends keyof MaintenanceReportInput>(
    field: K,
    value: MaintenanceReportInput[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  function validate(): boolean {
    const nextErrors: FormErrors = {}
    if (!form.equipmentId) nextErrors.equipmentId = 'Selecciona un equipo.'
    if (!form.date) nextErrors.date = 'Selecciona la fecha del reporte.'
    if (form.diagnosis.trim().length < 10) {
      nextErrors.diagnosis = 'El diagnóstico debe tener al menos 10 caracteres.'
    }
    if (form.activities.trim().length < 10) {
      nextErrors.activities = 'Describe las actividades realizadas.'
    }
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!validate()) return

    setSaving(true)
    try {
      const created = await createReport({
        ...form,
        diagnosis: form.diagnosis.trim(),
        activities: form.activities.trim(),
        results: form.results.trim(),
        recommendations: form.recommendations.trim(),
      })
      showToast(`Borrador ${created.folio} guardado correctamente.`)
      onClose()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo guardar el reporte.'
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
      title="Nuevo borrador de reporte"
      description="El reporte se creará en estado Borrador y podrás revisarlo antes de validarlo."
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="report-form" loading={saving}>
            {!saving && <Save className="h-4 w-4" aria-hidden="true" />}
            Guardar borrador
          </Button>
        </>
      }
    >
      {equipment.length === 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          No hay equipos registrados. Registra primero un equipo para documentar un reporte.
        </div>
      ) : (
        <form id="report-form" onSubmit={(event) => void handleSubmit(event)} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Equipo"
              htmlFor="report-equipment"
              required
              error={errors.equipmentId}
              className="sm:col-span-2"
            >
              <SelectInput
                id="report-equipment"
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
              label="Fecha del reporte"
              htmlFor="report-date"
              required
              error={errors.date}
              className="sm:col-span-2 sm:max-w-xs"
            >
              <TextInput
                id="report-date"
                type="date"
                value={form.date}
                onChange={(event) => update('date', event.target.value)}
                invalid={Boolean(errors.date)}
              />
            </FormField>

            <FormField
              label="Diagnóstico"
              htmlFor="report-diagnosis"
              required
              error={errors.diagnosis}
              hint="Hallazgos técnicos y causa probable, sin inventar lecturas de sensores."
              className="sm:col-span-2"
            >
              <TextArea
                id="report-diagnosis"
                rows={3}
                value={form.diagnosis}
                onChange={(event) => update('diagnosis', event.target.value)}
                placeholder="Describe el estado encontrado y el diagnóstico técnico..."
                invalid={Boolean(errors.diagnosis)}
              />
            </FormField>

            <FormField
              label="Actividades realizadas"
              htmlFor="report-activities"
              required
              error={errors.activities}
              className="sm:col-span-2"
            >
              <TextArea
                id="report-activities"
                rows={3}
                value={form.activities}
                onChange={(event) => update('activities', event.target.value)}
                placeholder="Inspecciones, mediciones, ajustes o sustituciones realizadas..."
                invalid={Boolean(errors.activities)}
              />
            </FormField>

            <FormField
              label="Resultados"
              htmlFor="report-results"
              hint="Opcional. Puedes completarlo al cerrar la intervención."
            >
              <TextArea
                id="report-results"
                rows={3}
                value={form.results}
                onChange={(event) => update('results', event.target.value)}
                placeholder="Estado final del equipo y comprobaciones realizadas..."
              />
            </FormField>

            <FormField
              label="Recomendaciones"
              htmlFor="report-recommendations"
              hint="Opcional. Acciones de seguimiento o próximos pasos."
            >
              <TextArea
                id="report-recommendations"
                rows={3}
                value={form.recommendations}
                onChange={(event) => update('recommendations', event.target.value)}
                placeholder="Seguimiento sugerido, repuestos o revisiones..."
              />
            </FormField>
          </div>

          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/60 p-4">
            <div className="flex items-start gap-3">
              <FileImage className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium text-slate-700">Fotografías del equipo</p>
                <p className="mt-0.5 text-xs leading-5 text-slate-500">
                  La carga de imágenes estará disponible en una próxima versión. Este espacio está
                  reservado y no guarda archivos todavía.
                </p>
              </div>
            </div>
          </div>
        </form>
      )}
    </Modal>
  )
}
