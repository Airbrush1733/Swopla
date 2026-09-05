/**
 * Afstand in kilometers tussen twee [lng, lat]-punten (Payload `point`-veldvolgorde).
 * Haversine-formule, geen externe dependency nodig voor dit doel.
 */
export function afstandKm(
  a: [number, number] | null | undefined,
  b: [number, number] | null | undefined,
): number | null {
  if (!a || !b) return null
  const [lngA, latA] = a
  const [lngB, latB] = b
  const R = 6371
  const dLat = ((latB - latA) * Math.PI) / 180
  const dLng = ((lngB - lngA) * Math.PI) / 180
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((latA * Math.PI) / 180) * Math.cos((latB * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
}

export function formatAfstand(km: number | null): string {
  if (km === null) return ''
  if (km < 1) return '< 1 km'
  return `${km.toFixed(1).replace('.0', '')} km`
}
