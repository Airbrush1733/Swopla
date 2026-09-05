export function initialenVan(naam: string | null | undefined, email: string): string {
  const bron = naam && naam.trim().length > 0 ? naam : email
  return bron
    .split(' ')
    .map((deel) => deel[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}
