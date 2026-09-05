// Kleine gedeelde helper voor Payload afterChange/beforeChange hooks
// (gebruikt door TradeProposals.ts, Disputes.ts, Users.ts).

/**
 * Haalt het numerieke ID uit een relationship-waarde, ongeacht of Payload die
 * op dat moment als los ID teruggeeft of als (deels) gepopuleerd document.
 */
export function getRelationId(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return value
  }
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: unknown }).id
    return typeof id === 'number' ? id : undefined
  }
  return undefined
}
