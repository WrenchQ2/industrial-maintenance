/** Genera el siguiente folio de demostración, por ejemplo OM-2026-014. */
export function nextFolio(prefix: string, existing: string[], year: number): string {
  const highest = existing.reduce((max, folio) => {
    const match = folio.match(/(\d+)$/)
    const value = match ? Number(match[1]) : 0
    return Number.isFinite(value) ? Math.max(max, value) : max
  }, 0)

  return `${prefix}-${year}-${String(highest + 1).padStart(3, '0')}`
}
