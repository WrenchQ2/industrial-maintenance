import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Compass, Home } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'

export function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <Card className="mx-auto mt-10 max-w-xl">
      <div className="flex flex-col items-center px-6 py-14 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-navy-50">
          <Compass className="h-7 w-7 text-navy-700" aria-hidden="true" />
        </span>
        <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-teal-700">Error 404</p>
        <h1 className="mt-1 text-xl font-semibold text-slate-900">Página no encontrada</h1>
        <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
          La ruta que intentas abrir no existe en este prototipo. Usa la navegación lateral para
          volver a una sección disponible.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Volver atrás
          </Button>
          <Link to="/">
            <Button>
              <Home className="h-4 w-4" aria-hidden="true" />
              Ir al dashboard
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  )
}
