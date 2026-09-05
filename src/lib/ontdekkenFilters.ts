import { afstandKm } from './geo'
import { categorieIdVan, voorouderKeten, type CategorieMap } from './categorieHelpers'
import type { ShopItem, User } from '@/payload-types'

export interface OntdekkenFilters {
  categorie: string[]
  staat: string[]
  overdracht: string | null
  afstand: string | null
  geverifieerd: boolean
  q: string
  sort: string
}

type ZoekParams = Record<string, string | string[] | undefined>

function alsArray(waarde: string | string[] | undefined): string[] {
  if (!waarde) return []
  return Array.isArray(waarde) ? waarde : [waarde]
}

function alsString(waarde: string | string[] | undefined): string | null {
  if (!waarde) return null
  return Array.isArray(waarde) ? (waarde[0] ?? null) : waarde
}

export function parseFilters(zoekParams: ZoekParams): OntdekkenFilters {
  return {
    categorie: alsArray(zoekParams.categorie),
    staat: alsArray(zoekParams.staat),
    overdracht: alsString(zoekParams.overdracht),
    afstand: alsString(zoekParams.afstand),
    geverifieerd: alsString(zoekParams.geverifieerd) === '1',
    q: alsString(zoekParams.q) ?? '',
    sort: alsString(zoekParams.sort) ?? 'match',
  }
}

const AFSTAND_KM: Record<string, number> = { '5': 5, '15': 15, '50': 50 }

export const STAAT_LABELS: Record<string, string> = {
  nieuwstaat: 'Nieuwstaat',
  zo_goed_als_nieuw: 'Zo goed als nieuw',
  gebruikssporen: 'Gebruikssporen',
  duidelijke_gebruikssporen: 'Duidelijke gebruikssporen',
}

/** Filtert vóór het scoren/sorteren — de matchscore zelf blijft ongemoeid. */
export function filterItems(
  items: ShopItem[],
  filters: OntdekkenFilters,
  categorieMap: CategorieMap,
  bezoekerLocatie: [number, number] | null | undefined,
): ShopItem[] {
  const gekozenCategorieIds = filters.categorie.map(Number).filter((n) => !Number.isNaN(n))

  return items.filter((item) => {
    if (filters.staat.length > 0 && !filters.staat.includes(item.staat)) return false

    if (gekozenCategorieIds.length > 0) {
      const itemId = categorieIdVan(item.categorie)
      const itemKeten = itemId !== null ? voorouderKeten(itemId, categorieMap) : new Set<number>()
      const matcht = gekozenCategorieIds.some((id) => itemKeten.has(id))
      if (!matcht) return false
    }

    if (filters.overdracht && !item.overdracht.includes(filters.overdracht as 'ophalen' | 'verzenden')) {
      return false
    }

    if (filters.geverifieerd) {
      const eigenaar = typeof item.eigenaar === 'object' ? (item.eigenaar as User) : null
      if (!(eigenaar?.geverifieerd_email && eigenaar?.geverifieerd_telefoon)) return false
    }

    if (filters.afstand && AFSTAND_KM[filters.afstand]) {
      const eigenaar = typeof item.eigenaar === 'object' ? (item.eigenaar as User) : null
      const km = afstandKm(bezoekerLocatie, eigenaar?.locatie_exact)
      if (km === null || km > AFSTAND_KM[filters.afstand]) return false
    }

    if (filters.q.trim().length > 0) {
      const q = filters.q.trim().toLowerCase()
      const inTekst = `${item.titel} ${item.beschrijving}`.toLowerCase().includes(q)
      if (!inTekst) return false
    }

    return true
  })
}
