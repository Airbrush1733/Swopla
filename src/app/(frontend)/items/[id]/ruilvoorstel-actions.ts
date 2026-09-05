'use server'

import { revalidatePath } from 'next/cache'

import { berekenVoorstelBalans, type VoorstelBalans } from '@/lib/matchscore'
import { getPayloadClient, getViewer } from '@/lib/viewer'
import type { Media, ProposalVersion, ShopItem, TradeProposal } from '@/payload-types'

/**
 * Server actions voor het ruilvoorstel-paneel (zie RuilvoorstelPaneel.tsx). Alles loopt via
 * de Payload local API (net als shop/nieuw/actions.ts), niet via de publieke REST API --
 * zelfde conventie als de rest van de codebase.
 *
 * Rolverdeling (besloten, zie context_item-veld op TradeProposals): deelnemer_a is altijd
 * de eigenaar van het context_item ("aanbieder"), deelnemer_b altijd wie het voorstel
 * startte ("zoeker"). Dit paneel wordt aangeroepen vanaf de productpagina van het
 * context_item, dus de "zoeker"-kant is altijd de bezoeker van die pagina, nooit de
 * eigenaar.
 */

export interface VoorstelItemSamenvatting {
  id: number
  titel: string
  categorie: string
  waarde_indicatie: ShopItem['waarde_indicatie']
}

export interface VoorstelBerichtSamenvatting {
  id: number
  auteurId: number
  tekst: string
  createdAt: string
}

export interface VoorstelStateVoorClient {
  id: number
  status: TradeProposal['status']
  aanbiederId: number
  zoekerId: number
  akkoordDoorId: number | null
  itemsVanAanbieder: VoorstelItemSamenvatting[]
  itemsVanZoeker: VoorstelItemSamenvatting[]
  balans: VoorstelBalans
  berichten: VoorstelBerichtSamenvatting[]
}

function naarItemSamenvatting(item: number | ShopItem): VoorstelItemSamenvatting | null {
  if (typeof item === 'number') return null
  const categorieNaam = typeof item.categorie === 'object' ? item.categorie.naam : ''
  return {
    id: item.id,
    titel: item.titel,
    categorie: categorieNaam,
    waarde_indicatie: item.waarde_indicatie,
  }
}

async function laatsteVersie(voorstelId: number) {
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'proposal-versions',
    where: { voorstel: { equals: voorstelId } },
    sort: '-createdAt',
    limit: 1,
    depth: 2,
  })
  return (res.docs[0] as ProposalVersion | undefined) ?? null
}

/**
 * Haalt de volledige actuele status van een ruilvoorstel op: gebruikt zowel bij het openen
 * van het paneel als (client-side) elke ~6s door polling voor de bijna-live chat, zie
 * Ralphs akkoord: "korte tijd tussen mag, chat is chat".
 */
export async function haalVoorstelState(voorstelId: number): Promise<VoorstelStateVoorClient> {
  const payload = await getPayloadClient()

  const [voorstel, versie, berichtenRes] = await Promise.all([
    payload.findByID({ collection: 'trade-proposals', id: voorstelId, depth: 0 }),
    laatsteVersie(voorstelId),
    payload.find({
      collection: 'proposal-messages',
      where: { voorstel: { equals: voorstelId } },
      sort: 'createdAt',
      limit: 200,
      depth: 0,
    }),
  ])

  const itemsVanAanbieder = (versie?.items_van_a ?? [])
    .map(naarItemSamenvatting)
    .filter((i): i is VoorstelItemSamenvatting => i !== null)
  const itemsVanZoeker = (versie?.items_van_b ?? [])
    .map(naarItemSamenvatting)
    .filter((i): i is VoorstelItemSamenvatting => i !== null)

  return {
    id: voorstel.id,
    status: voorstel.status,
    aanbiederId:
      typeof voorstel.deelnemer_a === 'object' ? voorstel.deelnemer_a.id : voorstel.deelnemer_a,
    zoekerId:
      typeof voorstel.deelnemer_b === 'object' ? voorstel.deelnemer_b.id : voorstel.deelnemer_b,
    akkoordDoorId:
      voorstel.akkoord_door === undefined || voorstel.akkoord_door === null
        ? null
        : typeof voorstel.akkoord_door === 'object'
          ? voorstel.akkoord_door.id
          : voorstel.akkoord_door,
    itemsVanAanbieder,
    itemsVanZoeker,
    balans: berekenVoorstelBalans(
      itemsVanAanbieder.map((i) => ({ waarde_indicatie: i.waarde_indicatie }) as ShopItem),
      itemsVanZoeker.map((i) => ({ waarde_indicatie: i.waarde_indicatie }) as ShopItem),
    ),
    berichten: berichtenRes.docs.map((b) => ({
      id: b.id,
      auteurId: typeof b.auteur === 'object' ? b.auteur.id : b.auteur,
      tekst: b.tekst,
      createdAt: b.createdAt,
    })),
  }
}

/**
 * Start een nieuw ruilvoorstel vanaf de productpagina. Gooit een Error door als iets niet
 * klopt (geen testgebruiker, niet geverifieerd -- zie checkVerificatie-hook op
 * TradeProposals.ts) zodat de aanroepende client-code dit als foutmelding kan tonen.
 */
export async function startVoorstel(
  itemId: number,
  gekozenItemIds: number[],
  toelichting: string,
): Promise<number> {
  const viewer = await getViewer()
  if (!viewer) throw new Error('Kies eerst een testgebruiker om een ruilvoorstel te starten.')
  if (gekozenItemIds.length === 0) {
    throw new Error('Selecteer minstens 1 product om aan te bieden.')
  }

  const payload = await getPayloadClient()
  const item = await payload.findByID({ collection: 'shop-items', id: itemId, depth: 0 })
  const eigenaarId = typeof item.eigenaar === 'object' ? item.eigenaar.id : item.eigenaar
  if (eigenaarId === viewer.id) {
    throw new Error('Je kunt geen ruilvoorstel doen op je eigen item.')
  }

  const voorstel = await payload.create({
    collection: 'trade-proposals',
    data: {
      context_item: itemId,
      deelnemer_a: eigenaarId,
      deelnemer_b: viewer.id,
      status: 'voorgesteld',
    },
  })

  await payload.create({
    collection: 'proposal-versions',
    data: {
      voorstel: voorstel.id,
      auteur: viewer.id,
      items_van_a: [itemId],
      items_van_b: gekozenItemIds,
    },
  })

  const itemsRes = await payload.find({
    collection: 'shop-items',
    where: { id: { in: gekozenItemIds } },
    depth: 0,
    limit: gekozenItemIds.length,
  })
  const aanbodTekst = `Ik bied: ${itemsRes.docs.map((i) => i.titel).join(', ')}`

  await payload.create({
    collection: 'proposal-messages',
    data: {
      voorstel: voorstel.id,
      auteur: viewer.id,
      tekst: toelichting.trim() ? `${aanbodTekst}\n\n${toelichting.trim()}` : aanbodTekst,
    },
  })

  revalidatePath(`/items/${itemId}`)
  return voorstel.id
}

/** Stuurt een chatbericht. Zet status van 'voorgesteld' naar 'in_onderhandeling' bij het eerste antwoord. */
export async function stuurBericht(voorstelId: number, tekst: string): Promise<void> {
  const viewer = await getViewer()
  if (!viewer) throw new Error('Kies eerst een testgebruiker.')
  if (!tekst.trim()) return

  const payload = await getPayloadClient()

  await payload.create({
    collection: 'proposal-messages',
    data: { voorstel: voorstelId, auteur: viewer.id, tekst: tekst.trim() },
  })

  const voorstel = await payload.findByID({
    collection: 'trade-proposals',
    id: voorstelId,
    depth: 0,
  })
  if (voorstel.status === 'voorgesteld') {
    await payload.update({
      collection: 'trade-proposals',
      id: voorstelId,
      data: { status: 'in_onderhandeling' },
    })
  }
}

/**
 * Wijzigt de items die de zoeker aanbiedt (toevoegen of verwijderen uit de pool/gekozen-
 * lijst). Maakt een nieuwe ProposalVersion aan (versiehistorie blijft bewaard) i.p.v. de
 * bestaande versie te overschrijven. In v1 alleen door de zoeker gebruikt (zie mockup: de
 * aanbieder-weergave is read-only, alleen Akkoord/Weigeren).
 */
export async function wijzigItemsVanZoeker(
  voorstelId: number,
  nieuweItemIds: number[],
): Promise<void> {
  const viewer = await getViewer()
  if (!viewer) throw new Error('Kies eerst een testgebruiker.')

  const payload = await getPayloadClient()
  const huidigeVersie = await laatsteVersie(voorstelId)
  const itemsVanA = (huidigeVersie?.items_van_a ?? []).map((i) =>
    typeof i === 'number' ? i : i.id,
  )

  await payload.create({
    collection: 'proposal-versions',
    data: {
      voorstel: voorstelId,
      auteur: viewer.id,
      items_van_a: itemsVanA,
      items_van_b: nieuweItemIds,
    },
  })
}

/** Aanbieder geeft akkoord: status -> geaccepteerd_wacht_op_bevestiging, wacht op bevestiging van de zoeker. */
export async function geefAkkoord(voorstelId: number): Promise<void> {
  const viewer = await getViewer()
  if (!viewer) throw new Error('Kies eerst een testgebruiker.')

  const payload = await getPayloadClient()
  await payload.update({
    collection: 'trade-proposals',
    id: voorstelId,
    data: { status: 'geaccepteerd_wacht_op_bevestiging', akkoord_door: viewer.id },
  })
}

/** Weigeren (aanbieder-kant): geen trackrecord-impact, zie TradeProposals.ts-hook. */
export async function weigerVoorstel(voorstelId: number): Promise<void> {
  const payload = await getPayloadClient()
  await payload.update({
    collection: 'trade-proposals',
    id: voorstelId,
    data: { status: 'geweigerd', akkoord_door: null },
  })
}

/**
 * Zoeker bevestigt na akkoord van de aanbieder -> voltooid. Kan niet de eigen akkoord
 * bevestigen (dat zou het tweezijdige handshake-doel omzeilen).
 */
export async function bevestigVoorstel(voorstelId: number): Promise<void> {
  const viewer = await getViewer()
  if (!viewer) throw new Error('Kies eerst een testgebruiker.')

  const payload = await getPayloadClient()
  const voorstel = await payload.findByID({
    collection: 'trade-proposals',
    id: voorstelId,
    depth: 0,
  })
  const akkoordDoorId =
    voorstel.akkoord_door === undefined || voorstel.akkoord_door === null
      ? null
      : typeof voorstel.akkoord_door === 'object'
        ? voorstel.akkoord_door.id
        : voorstel.akkoord_door

  if (voorstel.status !== 'geaccepteerd_wacht_op_bevestiging' || akkoordDoorId === viewer.id) {
    throw new Error('Deze ruil kan nu niet bevestigd worden.')
  }

  await payload.update({
    collection: 'trade-proposals',
    id: voorstelId,
    data: { status: 'voltooid' },
  })

  const versie = await laatsteVersie(voorstelId)
  const geruildeIds = [
    ...(versie?.items_van_a ?? []).map((i) => (typeof i === 'number' ? i : i.id)),
    ...(versie?.items_van_b ?? []).map((i) => (typeof i === 'number' ? i : i.id)),
  ]
  await Promise.all(
    geruildeIds.map((id) =>
      payload.update({ collection: 'shop-items', id, data: { status: 'geruild' } }),
    ),
  )
}

/** Zoeker sluit de onderhandeling (intrekken). Optionele reden komt als laatste chatbericht. */
export async function sluitOnderhandeling(voorstelId: number, reden: string): Promise<void> {
  const viewer = await getViewer()
  if (!viewer) throw new Error('Kies eerst een testgebruiker.')

  const payload = await getPayloadClient()

  if (reden.trim()) {
    await payload.create({
      collection: 'proposal-messages',
      data: {
        voorstel: voorstelId,
        auteur: viewer.id,
        tekst: `Onderhandeling gesloten. Reden: ${reden.trim()}`,
      },
    })
  }

  await payload.update({
    collection: 'trade-proposals',
    id: voorstelId,
    data: { status: 'ingetrokken', akkoord_door: null },
  })
}

export interface ShopItemSamenvatting {
  id: number
  titel: string
  categorie: string
  fotoUrl: string | null
}

function eersteFotoUrl(item: ShopItem): string | null {
  const eerste = item.fotos.find((f): f is Media => typeof f === 'object')
  return eerste?.url ?? null
}

/**
 * Voedt de "Shop van X"-tab in het ruilvoorstel-paneel (besloten: nu alsnog echt bouwen,
 * was eerst inert). Puur lezen/bladeren, geen actie hier: zoals de mockup al aangeeft
 * ("Zie je iets dat je erbij wilt? Vraag het in de chat") wordt iets toevoegen via de chat
 * gevraagd, niet direct vanuit dit tabblad.
 */
export async function haalShopVan(
  gebruikerId: number,
  uitgeslotenItemId?: number,
): Promise<ShopItemSamenvatting[]> {
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'shop-items',
    where: {
      and: [
        { eigenaar: { equals: gebruikerId } },
        { status: { equals: 'beschikbaar' } },
        ...(uitgeslotenItemId ? [{ id: { not_equals: uitgeslotenItemId } }] : []),
      ],
    },
    depth: 1,
    limit: 60,
  })
  return res.docs.map((i) => ({
    id: i.id,
    titel: i.titel,
    categorie: typeof i.categorie === 'object' ? i.categorie.naam : '',
    fotoUrl: eersteFotoUrl(i),
  }))
}
