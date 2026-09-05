import type { Category } from '@/payload-types'

export type CategorieId = number
export type CategorieMap = Map<CategorieId, Category>

/** Haalt het (mogelijk niet-gepopuleerde) id uit een Payload-relatiewaarde. */
export function categorieIdVan(
  waarde: number | Category | null | undefined,
): CategorieId | null {
  if (waarde === null || waarde === undefined) return null
  return typeof waarde === 'object' ? waarde.id : waarde
}

export function bouwCategorieMap(categorieen: Category[]): Map<CategorieId, Category> {
  const map = new Map<CategorieId, Category>()
  for (const c of categorieen) map.set(c.id, c)
  return map
}

function ouderId(categorie: Category): CategorieId | null {
  return categorieIdVan(categorie.parent)
}

/**
 * Geeft de categorie zelf plus al zijn voorouders terug (tot aan de hoofdcategorie).
 * Ondersteunt "match op elke diepte" (besloten, zie technische-architectuur-schets.md
 * → Categories): een interesse op een hoofdcategorie (bv. "Fietsen & vervoer") matcht ook
 * een item in een subcategorie daarvan (bv. "Racefietsen"), omdat beide ketens elkaar dan
 * overlappen op de hoofdcategorie.
 */
export function voorouderKeten(
  categorieId: CategorieId,
  categorieMap: Map<CategorieId, Category>,
): Set<CategorieId> {
  const keten = new Set<CategorieId>()
  let huidigId: CategorieId | null = categorieId
  let bewaker = 0
  while (huidigId !== null && !keten.has(huidigId) && bewaker < 20) {
    keten.add(huidigId)
    const huidig = categorieMap.get(huidigId)
    huidigId = huidig ? ouderId(huidig) : null
    bewaker++
  }
  return keten
}

export function ketensOverlappen(a: Set<CategorieId>, b: Set<CategorieId>): boolean {
  for (const id of a) {
    if (b.has(id)) return true
  }
  return false
}

/** Alleen hoofdcategorieën (parent leeg) — gebruikt voor de Categorie-filtergroep. */
export function hoofdcategorieen(categorieen: Category[]): Category[] {
  return categorieen
    .filter((c) => categorieIdVan(c.parent) === null)
    .sort((a, b) => a.naam.localeCompare(b.naam, 'nl'))
}
