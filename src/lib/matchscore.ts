import type { Category, MatchScoreConfig, ShopItem, User } from '@/payload-types'

import { afstandKm } from './geo'
import {
  categorieIdVan,
  ketensOverlappen,
  voorouderKeten,
  type CategorieId,
  type CategorieMap,
} from './categorieHelpers'

/**
 * Matchscore-berekeningen (Ontdekken-score, Productmatch, Marieke-match) — zie
 * concept-samenvatting.md → "Matching" en technische-architectuur-schets.md voor het
 * besloten model. De GEWICHTEN komen uit het configureerbare `match-score-config`-global
 * (nooit hardcoded — besloten projectregel). De sub-formules hieronder (afstandcurve,
 * betrouwbaarheids- en sociaal-normalisatie) zijn wél een eigen, pragmatische v1-invulling:
 * de weegrichting staat vast, de exacte curve niet — net als de gewichten zelf ("richting
 * staat vast, getal nog niet", zie MatchScoreConfig-adminomschrijving). Bewust niet aan
 * Ralph voorgelegd als aparte keuze omdat elk redelijk alternatief via dezelfde
 * configureerbare gewichten later bijgesteld kan worden zonder schemawijziging.
 *
 * De uitkomst (percentage) wordt getoond; de formule zelf blijft verborgen voor gebruikers
 * (tegen gaming, besloten in vindbaarheid-vergelijking.md).
 */

function inKeten(id: CategorieId | null, categorieMap: CategorieMap): Set<CategorieId> {
  return id === null ? new Set<CategorieId>() : voorouderKeten(id, categorieMap)
}

// ---------------------------------------------------------------------------
// Ontdekken-sortering: mix van interesses / zoekgeschiedenis / gewenst-terug
// ---------------------------------------------------------------------------

export interface OntdekkenScoreInput {
  item: ShopItem
  viewer: User | null
  viewerEigenItems: ShopItem[]
  zoektermen: string[]
  categorieMap: CategorieMap
  config: MatchScoreConfig
}

/** Som van de aanwezige signalen (gewichten tellen op tot 100 in de default-config). */
export function berekenOntdekkenScore(input: OntdekkenScoreInput): number {
  const { item, viewer, viewerEigenItems, zoektermen, categorieMap, config } = input
  if (!viewer) return 0

  const itemKeten = inKeten(categorieIdVan(item.categorie), categorieMap)
  let score = 0

  // 1. Interesses — breedste, meest passieve signaal (ook de terugval)
  const interesseIds = (viewer.interesses ?? [])
    .map(categorieIdVan)
    .filter((id): id is number => id !== null)
  const interesseMatch = interesseIds.some((id) => ketensOverlappen(inKeten(id, categorieMap), itemKeten))
  if (interesseMatch) score += config.gewicht_ontdekken_interesses ?? 0

  // 2. Zoekgeschiedenis — actueel, specifiek zoekgedrag
  const categorieNaam = categorieMap.get(categorieIdVan(item.categorie) ?? -1)?.naam ?? ''
  const doorzoekbaar = `${item.titel} ${item.beschrijving} ${categorieNaam}`.toLowerCase()
  const zoekMatch = zoektermen.some((term) => {
    const t = term.trim().toLowerCase()
    return t.length > 1 && doorzoekbaar.includes(t)
  })
  if (zoekMatch) score += config.gewicht_ontdekken_zoekgeschiedenis ?? 0

  // 3. Gewenst-terug — meest actief/specifiek, tweerichtingsmechanisme (zie concept-
  //    samenvatting.md): matcht hier andermans item tegen wat de bezoeker zelf terugwil.
  const gewenstTerugId = categorieIdVan(item.gewenst_terug)
  if (gewenstTerugId !== null) {
    const gewenstKeten = inKeten(gewenstTerugId, categorieMap)
    const gewenstMatch = viewerEigenItems.some((eigen) => {
      const eigenId = categorieIdVan(eigen.categorie)
      return eigenId !== null && ketensOverlappen(inKeten(eigenId, categorieMap), gewenstKeten)
    })
    if (gewenstMatch) score += config.gewicht_ontdekken_gewenst_terug ?? 0
  }

  return Math.min(100, Math.round(score))
}

// ---------------------------------------------------------------------------
// Productmatch (item-gebonden) — per kandidaat-item uit de eigen shop van de bezoeker
// ---------------------------------------------------------------------------

const WAARDE_RANG: Record<ShopItem['waarde_indicatie'], number> = { laag: 0, midden: 1, hoog: 2 }

function waardeBalansScore(a: ShopItem['waarde_indicatie'], b: ShopItem['waarde_indicatie']): number {
  const verschil = Math.abs(WAARDE_RANG[a] - WAARDE_RANG[b])
  if (verschil === 0) return 1
  if (verschil === 1) return 0.5
  return 0
}

export interface ProductmatchInput {
  bekekenItem: ShopItem
  kandidaat: ShopItem // item uit de shop van de bezoeker
  categorieMap: CategorieMap
  config: MatchScoreConfig
}

/**
 * Percentage voor één kandidaat-item van de bezoeker t.o.v. het bekeken item — getoond
 * per chip in de Ruilkansen-sectie. Specifiek (gewenst_terug ingevuld) weegt zwaarder dan
 * algemeen (categorie/Interesses-overlap), zoals besloten.
 */
export function berekenProductmatch(input: ProductmatchInput): number {
  const { bekekenItem, kandidaat, categorieMap, config } = input
  const kandidaatKeten = inKeten(categorieIdVan(kandidaat.categorie), categorieMap)

  let overlapScore = 0
  let overlapGewicht: number

  const gewenstTerugId = categorieIdVan(bekekenItem.gewenst_terug)
  if (gewenstTerugId !== null) {
    overlapGewicht = config.gewicht_productmatch_specifiek ?? 0
    overlapScore = ketensOverlappen(kandidaatKeten, inKeten(gewenstTerugId, categorieMap)) ? 1 : 0
  } else {
    overlapGewicht = config.gewicht_productmatch_algemeen ?? 0
    const bekekenKeten = inKeten(categorieIdVan(bekekenItem.categorie), categorieMap)
    overlapScore = ketensOverlappen(kandidaatKeten, bekekenKeten) ? 1 : 0
  }

  const staatWaardeGewicht = config.gewicht_staat_en_waarde ?? 0
  const staatWaardeScore = waardeBalansScore(bekekenItem.waarde_indicatie, kandidaat.waarde_indicatie)

  const maxMogelijk = overlapGewicht + staatWaardeGewicht
  if (maxMogelijk === 0) return 0

  const score = overlapScore * overlapGewicht + staatWaardeScore * staatWaardeGewicht
  return Math.round((score / maxMogelijk) * 100)
}

// ---------------------------------------------------------------------------
// Marieke-match (persoons-/shopgebonden) — bezoeker t.o.v. de aanbieder
// ---------------------------------------------------------------------------

export interface MariekeMatchInput {
  bezoeker: User
  bezoekerItems: ShopItem[]
  aanbieder: User
  aanbiederItems: ShopItem[]
  categorieMap: CategorieMap
  config: MatchScoreConfig
}

function betrouwbaarheidScore(gebruiker: User): number {
  const voltooid = gebruiker.voltooide_ruilen ?? 0
  const ingetrokken = gebruiker.ingetrokken_of_geweigerd ?? 0
  if (voltooid + ingetrokken === 0) return 0.5 // neutraal — nog geen trackrecord
  return voltooid / (voltooid + ingetrokken)
}

function sociaalScore(bezoeker: User, aanbieder: User, categorieMap: CategorieMap): number {
  const bezoekerInteresses = new Set(
    (bezoeker.interesses ?? []).map(categorieIdVan).filter((id): id is number => id !== null),
  )
  const aanbiederInteresses = (aanbieder.interesses ?? [])
    .map(categorieIdVan)
    .filter((id): id is number => id !== null)

  const overlapt = aanbiederInteresses.some((id) =>
    Array.from(bezoekerInteresses).some((eigenId) =>
      ketensOverlappen(inKeten(id, categorieMap), inKeten(eigenId, categorieMap)),
    ),
  )

  const verificatieScore =
    (aanbieder.geverifieerd_email ? 0.5 : 0) + (aanbieder.geverifieerd_telefoon ? 0.5 : 0)

  return (overlapt ? 0.5 : 0) + verificatieScore * 0.5
}

/**
 * De bredere "92% match met [naam]"-score bovenaan de Ruilkansen-sectie. Som van de
 * factoren die daadwerkelijk berekend konden worden (bv. geen locatiegegevens →
 * die factor telt niet mee in teller én noemer, i.p.v. als 0 mee te tellen).
 */
export function berekenMariekeMatch(input: MariekeMatchInput): number {
  const { bezoeker, bezoekerItems, aanbieder, aanbiederItems, categorieMap, config } = input

  let score = 0
  let maxMogelijk = 0

  // Shop-brede aanbod-vraag overlap: hoeveel van aanbieders items passen bij bezoekers Interesses
  const overlapGewicht = config.gewicht_aanbod_vraag_overlap ?? 0
  if (overlapGewicht > 0 && aanbiederItems.length > 0) {
    const bezoekerInteresses = (bezoeker.interesses ?? [])
      .map(categorieIdVan)
      .filter((id): id is number => id !== null)
    const passendeItems = aanbiederItems.filter((item) => {
      const itemKeten = inKeten(categorieIdVan(item.categorie), categorieMap)
      return bezoekerInteresses.some((id) => ketensOverlappen(inKeten(id, categorieMap), itemKeten))
    })
    score += overlapGewicht * (passendeItems.length / aanbiederItems.length)
    maxMogelijk += overlapGewicht
  }

  // Locatie: weegt lichter naarmate de items van de aanbieder vaker verzendbaar zijn
  const locatieGewicht = config.gewicht_locatie ?? 0
  const km = afstandKm(bezoeker.locatie_exact, aanbieder.locatie_exact)
  if (locatieGewicht > 0 && km !== null && aanbiederItems.length > 0) {
    const verzendAandeel =
      aanbiederItems.filter((i) => i.overdracht.includes('verzenden') && !i.overdracht.includes('ophalen'))
        .length / aanbiederItems.length
    const verzendKorting = (config.locatie_weging_ophalen_vs_verzenden ?? 50) / 100
    const effectiefGewicht = locatieGewicht * (1 - verzendAandeel * verzendKorting)
    const afstandScore = Math.max(0, 1 - km / 50)
    score += effectiefGewicht * afstandScore
    maxMogelijk += effectiefGewicht
  }

  // Betrouwbaarheid van de aanbieder
  const betrouwbaarheidGewicht = config.gewicht_betrouwbaarheid ?? 0
  if (betrouwbaarheidGewicht > 0) {
    score += betrouwbaarheidGewicht * betrouwbaarheidScore(aanbieder)
    maxMogelijk += betrouwbaarheidGewicht
  }

  // Sociaal: interesse-overlap + verificatie van de aanbieder
  const sociaalGewicht = config.gewicht_sociaal ?? 0
  if (sociaalGewicht > 0) {
    score += sociaalGewicht * sociaalScore(bezoeker, aanbieder, categorieMap)
    maxMogelijk += sociaalGewicht
  }

  // Reviews: nog niet gebouwd (v1, "optioneel, mag later") — telt alleen mee als er ooit
  // een gewicht > 0 aan gegeven wordt, dan pas heeft dit stuk verdere invulling nodig.

  if (maxMogelijk === 0) return 0
  return Math.round((score / maxMogelijk) * 100)
}
