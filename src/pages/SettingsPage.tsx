import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  Bell,
  Database,
  FlaskConical,
  RotateCcw,
  Save,
  Server,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { useAppData } from '../context/AppDataContext'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { DemoNotice } from '../components/ui/DemoNotice'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { FormField, TextInput } from '../components/ui/FormControls'
import { useToast } from '../components/ui/Toast'
import { cn } from '../utils/cn'

export function SettingsPage() {
  const { settings, updateSettings, resetDemo } = useAppData()
  const { showToast } = useToast()
  const [technicianName, setTechnicianName] = useState(settings.technicianName)
  const [notificationsEnabled, setNotificationsEnabled] = useState(settings.notificationsEnabled)
  const [nameError, setNameError] = useState('')
  const [saving, setSaving] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [resetting, setResetting] = useState(false)

  useEffect(() => {
    setTechnicianName(settings.technicianName)
    setNotificationsEnabled(settings.notificationsEnabled)
  }, [settings])

  const dirty =
    technicianName.trim() !== settings.technicianName ||
    notificationsEnabled !== settings.notificationsEnabled

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = technicianName.trim()
    if (!name) {
      setNameError('El nombre no puede estar vacío.')
      return
    }

    setSaving(true)
    updateSettings({ technicianName: name, notificationsEnabled })
    window.setTimeout(() => setSaving(false), 250)
    showToast('Preferencias guardadas en este navegador.')
  }

  async function handleReset() {
    setResetting(true)
    try {
      await resetDemo()
      showToast('Datos de demostración restaurados correctamente.', 'info')
      setResetOpen(false)
    } catch {
      showToast('No se pudieron restaurar los datos de demostración.', 'error')
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuración"
        description="Ajusta tus preferencias de demostración y consulta el estado de las integraciones."
      />

      <DemoNotice label="Configuración local de demostración · no se guardan credenciales ni secretos" />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader
              title="Perfil de demostración"
              description="El nombre se utiliza en la barra superior y en los reportes creados."
              action={<UserRound className="h-4 w-4 text-slate-400" aria-hidden="true" />}
            />
            <form onSubmit={handleSubmit} className="space-y-5 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  label="Nombre del técnico"
                  htmlFor="settings-technician-name"
                  error={nameError}
                  required
                >
                  <TextInput
                    id="settings-technician-name"
                    value={technicianName}
                    onChange={(event) => {
                      setTechnicianName(event.target.value)
                      setNameError('')
                    }}
                    invalid={Boolean(nameError)}
                    placeholder="Nombre y apellidos"
                  />
                </FormField>
                <FormField
                  label="Rol"
                  htmlFor="settings-role"
                  hint="Rol fijo mientras no exista autenticación."
                >
                  <TextInput id="settings-role" value="Supervisor de mantenimiento" disabled readOnly />
                </FormField>
              </div>

              <div className="flex items-start justify-between gap-4 rounded-lg border border-slate-200 p-4">
                <div className="flex items-start gap-3">
                  <Bell className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-medium text-slate-800">Notificaciones de demostración</p>
                    <p className="mt-0.5 text-xs leading-5 text-slate-500">
                      Muestra u oculta el indicador de notificaciones de la barra superior.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={notificationsEnabled}
                  aria-label="Activar notificaciones de demostración"
                  onClick={() => setNotificationsEnabled((value) => !value)}
                  className={cn(
                    'relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600',
                    notificationsEnabled ? 'bg-teal-600' : 'bg-slate-300',
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                      notificationsEnabled ? 'translate-x-6' : 'translate-x-1',
                    )}
                    aria-hidden="true"
                  />
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setTechnicianName(settings.technicianName)
                    setNotificationsEnabled(settings.notificationsEnabled)
                    setNameError('')
                  }}
                  disabled={!dirty || saving}
                >
                  Descartar cambios
                </Button>
                <Button type="submit" disabled={!dirty} loading={saving}>
                  {!saving && <Save className="h-4 w-4" aria-hidden="true" />}
                  Guardar preferencias
                </Button>
              </div>
            </form>
          </Card>

          <Card>
            <CardHeader
              title="Datos de demostración"
              description="Restaura equipos, órdenes, reportes y notificaciones originales."
              action={<FlaskConical className="h-4 w-4 text-amber-500" aria-hidden="true" />}
            />
            <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-slate-700">
                  Se eliminarán los cambios guardados en este navegador.
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Esta acción solo afecta a localStorage. No toca SQL Server ni el backend.
                </p>
              </div>
              <Button variant="outline" onClick={() => setResetOpen(true)}>
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Restaurar demo
              </Button>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Integraciones" description="Estado actual del prototipo" />
            <ul className="divide-y divide-slate-100">
              <IntegrationRow
                icon={Database}
                label="SQL Server"
                detail="Base de datos de producción"
                status="No conectado"
              />
              <IntegrationRow
                icon={Server}
                label="FastAPI"
                detail="Capa de servicios pendiente"
                status="No conectado"
              />
              <IntegrationRow
                icon={FlaskConical}
                label="Almacenamiento"
                detail="localStorage del navegador"
                status="Activo"
                active
              />
            </ul>
          </Card>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
              <div>
                <h2 className="text-sm font-semibold text-emerald-900">Sin credenciales</h2>
                <p className="mt-1 text-xs leading-5 text-emerald-800">
                  Este prototipo no solicita usuarios, contraseñas ni claves de API. La autenticación
                  se definirá al integrar el backend.
                </p>
              </div>
            </div>
          </div>

          <Card className="p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Acerca de
            </p>
            <p className="mt-1.5 text-sm font-semibold text-slate-800">Industrial Maintenance AI</p>
            <p className="mt-0.5 text-xs text-slate-500">Prototipo frontend · versión 0.1.0</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge tone="info">React</Badge>
              <Badge tone="info">TypeScript</Badge>
              <Badge tone="accent">Vite</Badge>
              <Badge tone="neutral">Tailwind CSS</Badge>
            </div>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={resetOpen}
        title="Restaurar datos de demostración"
        message="Se perderán los equipos, órdenes y reportes creados en este navegador. Los datos originales de demostración se volverán a cargar."
        confirmLabel="Restaurar datos"
        loading={resetting}
        onClose={() => setResetOpen(false)}
        onConfirm={() => void handleReset()}
      />
    </div>
  )
}

function IntegrationRow({
  icon: Icon,
  label,
  detail,
  status,
  active = false,
}: {
  icon: typeof Database
  label: string
  detail: string
  status: string
  active?: boolean
}) {
  return (
    <li className="flex items-center gap-3 px-5 py-3.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
        <Icon className="h-4 w-4 text-slate-500" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-800">{label}</p>
        <p className="truncate text-[11px] text-slate-400">{detail}</p>
      </div>
      <Badge tone={active ? 'success' : 'neutral'} dot>
        {status}
      </Badge>
    </li>
  )
}
