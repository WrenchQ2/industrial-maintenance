import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { cn } from '../../utils/cn'

export type ToastKind = 'success' | 'error' | 'info'

interface ToastItem {
  id: string
  message: string
  kind: ToastKind
}

interface ToastContextValue {
  showToast: (message: string, kind?: ToastKind) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const toastStyles: Record<ToastKind, string> = {
  success: 'border-emerald-200 bg-white text-emerald-900',
  error: 'border-red-200 bg-white text-red-900',
  info: 'border-sky-200 bg-white text-sky-900',
}

const toastIcons: Record<ToastKind, ReactNode> = {
  success: <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden="true" />,
  error: <AlertCircle className="h-5 w-5 text-red-600" aria-hidden="true" />,
  info: <Info className="h-5 w-5 text-sky-600" aria-hidden="true" />,
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback((message: string, kind: ToastKind = 'success') => {
    const id = crypto.randomUUID()
    setToasts((current) => [...current, { id, message, kind }])
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 top-4 z-[70] flex flex-col items-center gap-2 px-4 sm:items-end sm:px-6"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastCard({ toast, onClose }: { toast: ToastItem; onClose: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 4500)
    return () => window.clearTimeout(timer)
  }, [onClose])

  return (
    <div
      className={cn(
        'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border p-4 shadow-lg shadow-slate-900/5',
        toastStyles[toast.kind],
      )}
      role="status"
    >
      <span className="mt-0.5 shrink-0">{toastIcons[toast.kind]}</span>
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button
        type="button"
        onClick={onClose}
        className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        aria-label="Cerrar mensaje"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  )
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast debe usarse dentro de ToastProvider')
  return context
}
