'use server'

import { redirect } from 'next/navigation'

import { getPayloadClient, getViewer } from '@/lib/viewer'
import type { ShopItem, User } from '@/payload-types'

/**
 * Werkt een bestaand ShopItem bij. Zelfde velden en validatie als voegItemToe (zie
 * shop/nieuw/actions.ts), met twee verschillen:
 *
 * (1) Autorisatie: alleen de eigenaar mag bewerken, en alleen zolang de status
 * "Beschikbaar" is (besloten met Ralph: voorkomt wijzigen tijdens een lopende ruil). Beide
 * worden hier nogmaals server-side gecontroleerd i.p.v. alleen op de UI te vertrouwen (het
 * bewerk-potloodje op Mijn Shop wordt al verborgen bij een andere status, maar een al open
 * formulier in een oude tab zou anders alsnog kunnen posten).
 *
 * (2) Foto's zijn een mix van behouden bestaande Media-ids (`behouden_foto_ids`, komt van
 * FotoUploadVeld) en eventueel nieuw geuploade bestanden (`fotos`), i.p.v. alleen nieuwe
 * uploads zoals bij het aanmaken. Losgekoppelde foto's worden bewust niet hard verwijderd uit
 * de Media-collectie, dezelfde voorzichtige aanpak als elders in dit project (bv.
 * Users-anonimisering i.p.v. hard delete); dat kan later alsnog een aparte opschoonstap
 * worden als dat nodig blijkt.
 */
export async function wijzigItem(itemId: number, formData: FormData) {
  const viewer = await getViewer()
  if (!viewer) {
    throw new Error('Kies eerst een testgebruiker om een item te bewerken.')
  }

  const payload = await getPayloadClient()
  const bestaand = await payload.findByID({ collection: 'shop-items', id: itemId, depth: 0 })

  const eigenaarId =
    typeof bestaand.eigenaar === 'object' ? (bestaand.eigenaar as User).id : bestaand.eigenaar
  if (eigenaarId !== viewer.id) {
    throw new Error('Dit is niet een van jouw items.')
  }
  if (bestaand.status !== 'beschikbaar') {
    throw new Error(
      'Dit item kan niet meer bewerkt worden, er loopt al een ruil of het is al afgerond.',
    )
  }

  const titel = String(formData.get('titel') ?? '').trim()
  const beschrijving = String(formData.get('beschrijving') ?? '').trim()
  const categorieRaw = String(formData.get('categorie') ?? '')
  const staat = String(formData.get('staat') ?? '')
  const waarde_indicatie = String(formData.get('waarde_indicatie') ?? '')
  const overdrachtKeuze = String(formData.get('overdracht_keuze') ?? '')
  const gewenstTerugRaw = String(formData.get('gewenst_terug') ?? '')
  const behoudenFotoIds = String(formData.get('behouden_foto_ids') ?? '')
    .split(',')
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n) && n > 0)
  const nieuweFotoBestanden = formData
    .getAll('fotos')
    .filter((f): f is File => f instanceof File && f.size > 0)

  if (!titel || !beschrijving || !categorieRaw || !staat || !waarde_indicatie || !overdrachtKeuze) {
    throw new Error('Vul alle verplichte velden in.')
  }
  if (behoudenFotoIds.length === 0 && nieuweFotoBestanden.length === 0) {
    throw new Error('Voeg minstens 1 foto toe.')
  }

  const overdracht: ShopItem['overdracht'] =
    overdrachtKeuze === 'beide'
      ? ['ophalen', 'verzenden']
      : [overdrachtKeuze as 'ophalen' | 'verzenden']

  const nieuweFotoIds: number[] = []
  for (const bestand of nieuweFotoBestanden) {
    const buffer = Buffer.from(await bestand.arrayBuffer())
    const media = await payload.create({
      collection: 'media',
      data: { alt: titel },
      file: {
        data: buffer,
        mimetype: bestand.type || 'application/octet-stream',
        name: bestand.name,
        size: buffer.byteLength,
      },
    })
    nieuweFotoIds.push(media.id)
  }

  await payload.update({
    collection: 'shop-items',
    id: itemId,
    data: {
      titel,
      beschrijving,
      categorie: Number(categorieRaw),
      fotos: [...behoudenFotoIds, ...nieuweFotoIds],
      staat: staat as ShopItem['staat'],
      waarde_indicatie: waarde_indicatie as ShopItem['waarde_indicatie'],
      overdracht,
      gewenst_terug: gewenstTerugRaw ? Number(gewenstTerugRaw) : null,
    },
  })

  redirect('/shop')
}
