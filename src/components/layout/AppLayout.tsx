import { Suspense, useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { useAppData } from '../../context/AppDataContext'
import { Button } from '../ui/Button'
import { PageSkeleton } from '../ui/PageSkeleton'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { cn } from '../../utils/cn'

const SIDEBAR_STORAGE_KEY = 'imai.sidebar.collapsed'

export function AppLayout() {
  const { loading, error, resetDemo } = useAppData()
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true'
  })
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed))
  }, [collapsed])

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!mobileOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [mobileOpen])

  return (
    <div className="min-h-screen bg-slate-50">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-navy-900 focus:shadow-lg"
      >
        Saltar al contenido principal
      </a>

      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((value) => !value)}
      />

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 h-full w-full bg-slate-950/50"
            onClick={() => setMobileOpen(false)}
            aria-label="Cerrar menú de navegación"
          />
          <div className="relative h-full w-[280px] max-w-[85vw] shadow-2xl">
            <Sidebar
              mobile
              collapsed={false}
              onToggleCollapse={() => undefined}
              onCloseMobile={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}

      <div
        className={cn(
          'flex min-h-screen flex-col transition-[padding] duration-200',
          collapsed ? 'lg:pl-20' : 'lg:pl-64',
        )}
      >
        <Topbar onOpenMobileSidebar={() => setMobileOpen(true)} />

        <main id="main-content" className="mx-auto w-full min-w-0 max-w-[1600px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {loading ? (
            <PageSkeleton />
          ) : error ? (
            <div className="mx-auto mt-12 max-w-md rounded-xl border border-red-200 bg-white p-6 text-center shadow-sm">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
                <AlertCircle className="h-6 w-6 text-red-600" aria-hidden="true" />
              </span>
              <h1 className="mt-4 text-base font-semibold text-slate-900">
                No se pudo cargar la aplicación
              </h1>
              <p className="mt-2 text-sm text-slate-500">{error}</p>
              <Button className="mt-5" onClick={() => void resetDemo()}>
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Restaurar datos de demostración
              </Button>
            </div>
          ) : (
            <Suspense fallback={<PageSkeleton />}>
              <Outlet />
            </Suspense>
          )}
        </main>

        <footer className="border-t border-slate-200/80 px-4 py-4 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-[1600px] flex-col gap-1 text-[11px] text-slate-400 sm:flex-row sm:items-center sm:justify-between">
            <p>Industrial Maintenance AI · Prototipo frontend v0.1</p>
            <p>Datos ficticios con persistencia local. Sin servicios externos conectados.</p>
          </div>
        </footer>
      </div>
    </div>
  )
}
