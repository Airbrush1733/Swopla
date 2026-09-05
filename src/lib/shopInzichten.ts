import type { ShopItem } from '@/payload-types'

export interface ItemViewRuw {
  item: number | { id: number }
  createdAt: string
}

export interface ShopInzichten {
  weergavenDezeMaand: number
  weergavenVorigeMaand: number
  /** null wanneer er in de vorige maand geen weergaven waren om een percentage tegen af te zetten. */
  trendPercentage: number | null
  meestBekekenItem: { item: ShopItem; weergaven: number } | null
  categorieen: { id: number; naam: string }[]
}

function itemIdVan(waarde: number | { id: number }): number {
  return typeof waarde === 'object' ? waarde.id : waarde
}

/**
 * Berekent de cijfers voor de Inzichten-zijbalk op het Shop-scherm uit ruwe item-views +
 * eigen items. Puur functioneel (geen DB-aanroepen), zelfde opzet als lib/matchscore.ts en
 * lib/ontdekkenFilters.ts, zodat de aggregatielogica los te testen en te hergebruiken is.
 *
 * `itemViews` bevat hier alle weergave-records van de eigen items (zie item-views.eigenaar,
 * gedenormaliseerd -- zo hoeft de aanroeper geen los item-ids-filter te bouwen). Voor de
 * huidige schaal van het project is één keer alles ophalen en in JS aggregeren (i.p.v. losse
 * count()-queries per item of per maand) simpeler en snel genoeg; bij veel grotere volumes
 * per gebruiker zou dit een DB-aggregatie moeten worden.
 */
export function berekenShopInzichten(
  items: ShopItem[],
  itemViews: ItemViewRuw[],
  nu: Date = new Date(),
): ShopInzichten {
  const startDezeMaand = new Date(nu.getFullYear(), nu.getMonth(), 1)
  const startVorigeMaand = new Date(nu.getFullYear(), nu.getMonth() - 1, 1)

  let weergavenDezeMaand = 0
  let weergavenVorigeMaand = 0
  const tellingPerItem = new Map<number, number>()

  for (const view of itemViews) {
    const id = itemIdVan(view.item)
    tellingPerItem.set(id, (tellingPerItem.get(id) ?? 0) + 1)

    const datum = new Date(view.createdAt)
    if (datum >= startDezeMaand) weergavenDezeMaand++
    else if (datum >= startVorigeMaand) weergavenVorigeMaand++
  }

  const trendPercentage =
    weergavenVorigeMaand > 0
      ? Math.round(((weergavenDezeMaand - weergavenVorigeMaand) / weergavenVorigeMaand) * 100)
      : null

  let meestBekekenItem: ShopInzichten['meestBekekenItem'] = null
  for (const item of items) {
    const weergaven = tellingPerItem.get(item.id) ?? 0
    if (weergaven > 0 && (!meestBekekenItem || weergaven > meestBekekenItem.weergaven)) {
      meestBekekenItem = { item, weergaven }
    }
  }

  const categorieMap = new Map<number, string>()
  for (const item of items) {
    if (typeof item.categorie === 'object' && item.categorie) {
      categorieMap.set(item.categorie.id, item.categorie.naam)
    }
  }

  return {
    weergavenDezeMaand,
    weergavenVorigeMaand,
    trendPercentage,
    meestBekekenItem,
    categorieen: Array.from(categorieMap, ([id, naam]) => ({ id, naam })),
  }
}
