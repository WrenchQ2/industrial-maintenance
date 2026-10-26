import { useEffect, useState } from 'react'
import { FileImage, Save } from 'lucide-react'
import type { Equipment, MaintenanceReport, ReportStatus } from '../../types'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { SelectInput } from '../ui/FormControls'
import { useToast } from '../ui/Toast'
import { useAppData } from '../../context/AppDataContext'
import { formatDate } from '../../utils/date'
import { reportStatusTone } from '../../utils/status'

const statusOptions: ReportStatus[] = ['Borrador', 'En revisión', 'Aprobado']

interface ReportPreviewModalProps {
  report: MaintenanceReport | null
  equipment: Equipment | undefined
  onClose: () => void
}

export function ReportPreviewModal({ report, equipment, onClose }: ReportPreviewModalProps) {
  const { updateReportStatus } = useAppData()
  const { showToast } = useToast()
  const [selectedStatus, setSelectedStatus] = useState<ReportStatus>('Borrador')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (report) setSelectedStatus(report.status)
  }, [report])

  if (!report) return null

  const statusChanged = selectedStatus !== report.status

  async function handleUpdateStatus() {
    if (!report || !statusChanged) return
    setSaving(true)
    try {
      await updateReportStatus(report.id, selectedStatus)
      showToast(`Reporte ${report.folio} actualizado a "${selectedStatus}".`)
    } catch {
      showToast('No se pudo actualizar el estado del reporte.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={report !== null}
      onClose={onClose}
      title={`Vista previa · ${report.folio}`}
      description={
        equipment ? `${equipment.code} · ${equipment.name}` : 'Equipo no disponible'
      }
      size="lg"
      footer={
        <>
          <p className="mr-auto hidden text-[11px] text-slate-400 sm:block">
            Vista de demostración. No genera PDF ni Word.
          </p>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={reportStatusTone(report.status)} dot>
              {report.status}
            </Badge>
            <span className="text-xs text-slate-500">
              {formatDate(report.date)} · Técnico: {report.technician}
            </span>
          </div>
          <span className="rounded bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
            Datos demo
          </span>
        </div>

        <ReportSection title="Diagnóstico" content={report.diagnosis} />
        <ReportSection title="Actividades realizadas" content={report.activities} />
        <ReportSection title="Resultados" content={report.results} />
        <ReportSection title="Recomendaciones" content={report.recommendations} />

        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Fotografías del equipo
          </h3>
          <div className="mt-2 grid grid-cols-3 gap-3">
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                className="flex aspect-[4/3] flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-2 text-center"
              >
                <FileImage className="h-5 w-5 text-slate-300" aria-hidden="true" />
                <p className="mt-1 text-[10px] leading-3 text-slate-400">Sin fotografía</p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            Espacio reservado para imágenes en una próxima versión.
          </p>
        </section>

        <section className="rounded-lg border border-slate-200 p-4">
          <label htmlFor="report-preview-status" className="mb-2 block text-sm font-medium text-slate-700">
            Estado del reporte
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <SelectInput
              id="report-preview-status"
              value={selectedStatus}
              onChange={(event) => setSelectedStatus(event.target.value as ReportStatus)}
              className="sm:max-w-xs"
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </SelectInput>
            <Button
              onClick={() => void handleUpdateStatus()}
              disabled={!statusChanged}
              loading={saving}
            >
              {!saving && <Save className="h-4 w-4" aria-hidden="true" />}
              Actualizar estado
            </Button>
          </div>
        </section>
      </div>
    </Modal>
  )
}

function ReportSection({ title, content }: { title: string; content: string }) {
  return (
    <section>
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{title}</h3>
      <p className="mt-1.5 whitespace-pre-line text-sm leading-6 text-slate-700">
        {content.trim() || 'Sin completar en este borrador.'}
      </p>
    </section>
  )
}
