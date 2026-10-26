import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'

/** Cierra un menú al hacer clic fuera de su contenedor. */
export function useClickOutside<T extends HTMLElement>(
  onOutside: () => void,
  active: boolean,
): RefObject<T | null> {
  const ref = useRef<T>(null)

  useEffect(() => {
    if (!active) return

    const handlePointerDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onOutside()
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [active, onOutside])

  return ref
}
