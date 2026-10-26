import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpRight, Boxes, ClipboardList, Search } from 'lucide-react'
import { useAppData } from '../../context/AppDataContext'
import { useClickOutside } from '../../hooks/useClickOutside'
import { cn } from '../../utils/cn'

interface GlobalSearchProps {
  className?: string
  autoFocus?: boolean
  onNavigate?: () => void
}

export function GlobalSearch({ className, autoFocus = false, onNavigate }: GlobalSearchProps) {
  const { equipment, orders } = useAppData()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  const close = useCallback(() => setOpen(false), [])
  const containerRef = useClickOutside<HTMLDivElement>(close, open)

  const term = query.trim().toLowerCase()

  const matchedEquipment = useMemo(() => {
    if (term.length < 2) return []
    return equipment
      .filter((item) =>
        [item.name, item.code, item.manufacturer, item.model, item.location]
          .join(' ')
          .toLowerCase()
          .includes(term),
      )
      .slice(0, 4)
  }, [equipment, term])

  const matchedOrders = useMemo(() => {
    if (term.length < 2) return []
    return orders
      .filter((item) =>
        [item.folio, item.description, item.technician, item.type]
          .join(' ')
          .toLowerCase()
          .includes(term),
      )
      .slice(0, 4)
  }, [orders, term])

  const hasResults = matchedEquipment.length > 0 || matchedOrders.length > 0
  const showPanel = open && term.length >= 2

  function goTo(path: string) {
    setOpen(false)
    setQuery('')
    onNavigate?.()
    navigate(path)
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <label htmlFor="global-search" className="sr-only">
        Buscar equipos u órdenes
      </label>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        aria-hidden="true"
      />
      <input
        id="global-search"
        type="search"
        autoFocus={autoFocus}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        placeholder="Buscar equipo u orden..."
        className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-700 transition placeholder:text-slate-400 focus:border-teal-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600/15"
      />

      {showPanel && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(92vw,26rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
          {hasResults ? (
            <div className="scrollbar-thin max-h-96 overflow-y-auto p-2">
              {matchedEquipment.length > 0 && (
                <div>
                  <p className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Equipos
                  </p>
                  {matchedEquipment.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => goTo(`/equipment/${item.id}`)}
                      className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-slate-50"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy-50">
                        <Boxes className="h-4 w-4 text-navy-700" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-slate-800">
                          {item.name}
                        </span>
                        <span className="block truncate text-xs text-slate-500">
                          {item.code} · {item.location}
                        </span>
                      </span>
                      <ArrowUpRight className="h-4 w-4 text-slate-300" aria-hidden="true" />
                    </button>
                  ))}
                </div>
              )}

              {matchedOrders.length > 0 && (
                <div>
                  <p className="px-2 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Órdenes
                  </p>
                  {matchedOrders.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => goTo(`/orders/${item.id}`)}
                      className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-slate-50"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-50">
                        <ClipboardList className="h-4 w-4 text-teal-700" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-slate-800">
                          {item.folio}
                        </span>
                        <span className="block truncate text-xs text-slate-500">
                          {item.type} · {item.status}
                        </span>
                      </span>
                      <ArrowUpRight className="h-4 w-4 text-slate-300" aria-hidden="true" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="px-4 py-8 text-center">
              <Search className="mx-auto h-5 w-5 text-slate-300" aria-hidden="true" />
              <p className="mt-2 text-sm font-medium text-slate-700">Sin resultados</p>
              <p className="mt-0.5 text-xs text-slate-500">
                Prueba con un código, folio, fabricante o ubicación.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
