'use server'

import { redirect } from 'next/navigation'

import { getPayloadClient, getViewer } from '@/lib/viewer'
import type { ShopItem } from '@/payload-types'

/**
 * Maakt een nieuw ShopItem aan namens de huidige testgebruiker. Velden 1-op-1 volgens
 * ShopItems.ts (zie concept-samenvatting.md → "Item toevoegen aan shop"): titel,
 * beschrijving, categorie, foto's, staat, waarde-indicatie, overdracht (incl. "beide
 * mogelijk" als kortere optie), en het optionele gewenst_terug ("Alles mag geboden worden"
 * = leeg laten).
 *
 * Fouten (geen testgebruiker gekozen, verplicht veld ontbreekt) gooien een Error i.p.v.
 * stil te falen -- dit is nog geen client-side geformulierde validatie, dus de fout komt nu
 * terecht in Next.js' ingebouwde error-overlay/pagina. Prima voor deze eerste versie; een
 * nettere inline foutmelding kan later.
 */
export async function voegItemToe(formData: FormData) {
  const viewer = await getViewer()
  if (!viewer) {
    throw new Error('Kies eerst een testgebruiker om een item toe te voegen.')
  }

  const titel = String(formData.get('titel') ?? '').trim()
  const beschrijving = String(formData.get('beschrijving') ?? '').trim()
  const categorieRaw = String(formData.get('categorie') ?? '')
  const staat = String(formData.get('staat') ?? '')
  const waarde_indicatie = String(formData.get('waarde_indicatie') ?? '')
  const overdrachtKeuze = String(formData.get('overdracht_keuze') ?? '')
  const gewenstTerugRaw = String(formData.get('gewenst_terug') ?? '')
  const fotoBestanden = formData
    .getAll('fotos')
    .filter((f): f is File => f instanceof File && f.size > 0)

  if (!titel || !beschrijving || !categorieRaw || !staat || !waarde_indicatie || !overdrachtKeuze) {
    throw new Error('Vul alle verplichte velden in.')
  }
  if (fotoBestanden.length === 0) {
    throw new Error('Voeg minstens 1 foto toe.')
  }

  const overdracht: ShopItem['overdracht'] =
    overdrachtKeuze === 'beide'
      ? ['ophalen', 'verzenden']
      : [overdrachtKeuze as 'ophalen' | 'verzenden']

  const payload = await getPayloadClient()

  const fotoIds: number[] = []
  for (const bestand of fotoBestanden) {
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
    fotoIds.push(media.id)
  }

  const nieuwItem = await payload.create({
    collection: 'shop-items',
    data: {
      eigenaar: viewer.id,
      titel,
      beschrijving,
      categorie: Number(categorieRaw),
      fotos: fotoIds,
      staat: staat as ShopItem['staat'],
      waarde_indicatie: waarde_indicatie as ShopItem['waarde_indicatie'],
      overdracht,
      status: 'beschikbaar',
      ...(gewenstTerugRaw ? { gewenst_terug: Number(gewenstTerugRaw) } : {}),
    },
  })

  redirect(`/items/${nieuwItem.id}`)
}
