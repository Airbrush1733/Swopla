export function initialenVan(naam: string | null | undefined, email: string): string {
  const bron = naam && naam.trim().length > 0 ? naam : email
  return bron
    .split(' ')
    .map((deel) => deel[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

/**
 * Relatieve tijdsaanduiding ("3 uur geleden"). Verplaatst hierheen vanuit
 * RuilvoorstelPaneel.tsx (was daar lokaal gedefinieerd) zodat het Ruilvoorstellen-overzicht
 * (src/app/(frontend)/ruilvoorstellen/page.tsx) dezelfde functie kan hergebruiken in plaats
 * van een tweede, mogelijk afwijkende implementatie te krijgen.
 */
export function tijdGeleden(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.floor(ms / 60000)
  if (min < 1) return 'Zojuist'
  if (min < 60) return `${min} min geleden`
  const uur = Math.floor(min / 60)
  if (uur < 24) return `${uur} uur geleden`
  return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
}
