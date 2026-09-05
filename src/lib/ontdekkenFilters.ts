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

// ---------------------------------------------------------------------------
// Eén predicaat per filterdimensie — los van elkaar, zodat facet-tellingen
// hieronder "alle filters behalve dimensie X" kunnen samenstellen.
// ---------------------------------------------------------------------------

function matchtCategorie(item: ShopItem, categorieIds: number[], categorieMap: CategorieMap): boolean {
  if (categorieIds.length === 0) return true
  const itemId = categorieIdVan(item.categorie)
  const itemKeten = itemId !== null ? voorouderKeten(itemId, categorieMap) : new Set<number>()
  return categorieIds.some((id) => itemKeten.has(id))
}

function matchtStaat(item: ShopItem, staatWaarden: string[]): boolean {
  if (staatWaarden.length === 0) return true
  return staatWaarden.includes(item.staat)
}

function matchtOverdracht(item: ShopItem, waarde: string | null): boolean {
  if (!waarde) return true
  return item.overdracht.includes(waarde as 'ophalen' | 'verzenden')
}

function matchtGeverifieerd(item: ShopItem, actief: boolean): boolean {
  if (!actief) return true
  const eigenaar = typeof item.eigenaar === 'object' ? (item.eigenaar as User) : null
  return Boolean(eigenaar?.geverifieerd_email && eigenaar?.geverifieerd_telefoon)
}

function matchtAfstand(
  item: ShopItem,
  waarde: string | null,
  bezoekerLocatie: [number, number] | null | undefined,
): boolean {
  if (!waarde || !AFSTAND_KM[waarde]) return true
  const eigenaar = typeof item.eigenaar === 'object' ? (item.eigenaar as User) : null
  const km = afstandKm(bezoekerLocatie, eigenaar?.locatie_exact)
  return km !== null && km <= AFSTAND_KM[waarde]
}

function matchtQ(item: ShopItem, q: string): boolean {
  const trimmed = q.trim().toLowerCase()
  if (!trimmed) return true
  return `${item.titel} ${item.beschrijving}`.toLowerCase().includes(trimmed)
}

/** Filtert vóór het scoren/sorteren — de matchscore zelf blijft ongemoeid. */
export function filterItems(
  items: ShopItem[],
  filters: OntdekkenFilters,
  categorieMap: CategorieMap,
  bezoekerLocatie: [number, number] | null | undefined,
): ShopItem[] {
  const gekozenCategorieIds = filters.categorie.map(Number).filter((n) => !Number.isNaN(n))

  return items.filter(
    (item) =>
      matchtCategorie(item, gekozenCategorieIds, categorieMap) &&
      matchtStaat(item, filters.staat) &&
      matchtOverdracht(item, filters.overdracht) &&
      matchtGeverifieerd(item, filters.geverifieerd) &&
      matchtAfstand(item, filters.afstand, bezoekerLocatie) &&
      matchtQ(item, filters.q),
  )
}

// ---------------------------------------------------------------------------
// Facet-tellingen: hoeveel items zou elke filteroptie opleveren, gegeven de
// AL geselecteerde filters in de ANDERE groepen (besloten, zie Ralphs
// voorbeeld: "Auto's is 1000, dan naar 2-deurs wordt het 200"). Binnen één
// groep tellen opties dus tegen de rest van de selectie (zodat je tussen
// opties in dezelfde groep kunt wisselen); tussen groepen is het een AND.
// ---------------------------------------------------------------------------

export interface FacetTellingen {
  categorie: Record<number, number>
  staat: Record<string, number>
  overdracht: { beide: number; ophalen: number; verzenden: number }
  afstand: Record<string, number>
  geverifieerd: number
}

type FilterDimensie = 'categorie' | 'staat' | 'overdracht' | 'afstand' | 'geverifieerd'

export function berekenFacetTellingen(
  items: ShopItem[],
  filters: OntdekkenFilters,
  categorieMap: CategorieMap,
  bezoekerLocatie: [number, number] | null | undefined,
  hoofdCategorieIds: number[],
): FacetTellingen {
  const gekozenCategorieIds = filters.categorie.map(Number).filter((n) => !Number.isNaN(n))

  function basis(exclusief: FilterDimensie): ShopItem[] {
    return items.filter((item) => {
      if (exclusief !== 'categorie' && !matchtCategorie(item, gekozenCategorieIds, categorieMap)) return false
      if (exclusief !== 'staat' && !matchtStaat(item, filters.staat)) return false
      if (exclusief !== 'overdracht' && !matchtOverdracht(item, filters.overdracht)) return false
      if (exclusief !== 'afstand' && !matchtAfstand(item, filters.afstand, bezoekerLocatie)) return false
      if (exclusief !== 'geverifieerd' && !matchtGeverifieerd(item, filters.geverifieerd)) return false
      if (!matchtQ(item, filters.q)) return false
      return true
    })
  }

  const basisCategorie = basis('categorie')
  const categorie: Record<number, number> = {}
  for (const id of hoofdCategorieIds) {
    categorie[id] = basisCategorie.filter((item) => matchtCategorie(item, [id], categorieMap)).length
  }

  const basisStaat = basis('staat')
  const staat: Record<string, number> = {}
  for (const waarde of Object.keys(STAAT_LABELS)) {
    staat[waarde] = basisStaat.filter((item) => matchtStaat(item, [waarde])).length
  }

  const basisOverdracht = basis('overdracht')
  const overdracht = {
    beide: basisOverdracht.length,
    ophalen: basisOverdracht.filter((item) => matchtOverdracht(item, 'ophalen')).length,
    verzenden: basisOverdracht.filter((item) => matchtOverdracht(item, 'verzenden')).length,
  }

  const basisAfstand = basis('afstand')
  const afstand: Record<string, number> = { '': basisAfstand.length }
  for (const waarde of Object.keys(AFSTAND_KM)) {
    afstand[waarde] = basisAfstand.filter((item) => matchtAfstand(item, waarde, bezoekerLocatie)).length
  }

  const basisGeverifieerd = basis('geverifieerd')
  const geverifieerd = basisGeverifieerd.filter((item) => matchtGeverifieerd(item, true)).length

  return { categorie, staat, overdracht, afstand, geverifieerd }
}
