import type { TradeProposal } from '@/payload-types'

/**
 * Statuslabels en badge-kleuren voor een Ruilvoorstel, gedeeld tussen RuilvoorstelPaneel.tsx
 * (paneel-header) en het Ruilvoorstellen-overzicht (src/app/(frontend)/ruilvoorstellen/page.tsx).
 * Was voorheen alleen lokaal gedefinieerd in RuilvoorstelPaneel.tsx; hierheen verplaatst zodat
 * beide plekken exact dezelfde labels/kleuren tonen in plaats van een tweede, los bij te houden
 * kopie te krijgen.
 */

export const STATUS_LABELS: Record<TradeProposal['status'], string> = {
  bevestigd_door_a: 'Bevestigd door A',
  bevestigd_door_b: 'Bevestigd door B',
  geaccepteerd_wacht_op_bevestiging: 'Wacht op bevestiging',
  geweigerd: 'Geweigerd',
  in_onderhandeling: 'In onderhandeling',
  ingetrokken: 'Gesloten',
  verlopen: 'Verlopen',
  voltooid: 'Voltooid',
  voorgesteld: 'Nieuw voorstel',
}

export function statusBadgeKleuren(status: TradeProposal['status']): { bg: string; fg: string } {
  if (status === 'voltooid') return { bg: 'oklch(90% 0.06 150)', fg: 'oklch(30% 0.1 150)' }
  if (status === 'geweigerd' || status === 'ingetrokken' || status === 'verlopen')
    return { bg: 'oklch(93% 0.015 90)', fg: 'oklch(45% 0.03 150)' }
  return { bg: 'oklch(95% 0.06 55)', fg: 'oklch(40% 0.11 55)' }
}

/**
 * Groepering voor het Ruilvoorstellen-overzicht (besloten, zie concept-samenvatting.md ->
 * "Ruilvoorstellen: overzichtsscherm"): "Afgerond" zijn de vier eindstations, "Actief" is de rest.
 */
export const AFGERONDE_STATUSSEN = new Set<TradeProposal['status']>([
  'voltooid',
  'geweigerd',
  'ingetrokken',
  'verlopen',
])
