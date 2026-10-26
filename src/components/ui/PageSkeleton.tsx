import { cn } from '../../utils/cn'

export function PageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-label="Cargando contenido">
      <div className="space-y-2">
        <div className="h-7 w-72 rounded bg-slate-200" />
        <div className="h-4 w-96 max-w-full rounded bg-slate-200" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-28 rounded-xl border border-slate-200 bg-white p-4">
            <div className="h-3 w-20 rounded bg-slate-200" />
            <div className="mt-4 h-7 w-14 rounded bg-slate-200" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className={cn(
              'h-72 rounded-xl border border-slate-200 bg-white',
              index === 0 && 'lg:col-span-1',
            )}
          />
        ))}
      </div>
      <div className="h-80 rounded-xl border border-slate-200 bg-white" />
    </div>
  )
}
