import Link from 'next/link'
import { notFound } from 'next/navigation'
import React from 'react'

import { wijzigItem } from './actions'
import CategoriePicker from '@/components/CategoriePicker'
import FotoUploadVeld from '@/components/FotoUploadVeld'
import GewenstTerugVeld from '@/components/GewenstTerugVeld'
import { STAAT_LABELS, WAARDE_LABELS } from '@/lib/ontdekkenFilters'
import { getPayloadClient, getViewer } from '@/lib/viewer'
import type { Category, Media, ShopItem, User } from '@/payload-types'

/**
 * Bewerkscherm voor een eigen item, hergebruikt dezelfde velden/componenten als "Item
 * toevoegen" (shop/nieuw/page.tsx), nu vooraf ingevuld met de huidige waarden. Alleen
 * bereikbaar via het bewerk-potloodje op Mijn Shop, en alleen zolang het item nog
 * "Beschikbaar" is (besloten met Ralph, zie ook de server-side controle in actions.ts).
 */
export default async function ItemBewerkenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idParam } = await params
  const id = Number(idParam)
  if (!Number.isFinite(id)) notFound()

  const viewer = await getViewer()
  if (!viewer) {
    return (
      <div className="pagina">
        <div className="niet-ingelogd-melding">
          Kies hierboven een testgebruiker om een item te bewerken.
        </div>
      </div>
    )
  }

  const payload = await getPayloadClient()
  let item: ShopItem
  try {
    item = await payload.findByID({ collection: 'shop-items', id, depth: 1 })
  } catch {
    notFound()
  }

  const eigenaar = typeof item.eigenaar === 'object' ? (item.eigenaar as User) : null
  if (!eigenaar || eigenaar.id !== viewer.id) {
    return (
      <div className="pagina">
        <div className="niet-ingelogd-melding">Dit is niet een van jouw items.</div>
      </div>
    )
  }

  if (item.status !== 'beschikbaar') {
    return (
      <div className="pagina pagina--smal">
        <Link href="/shop" className="terug-link">
          ← Terug naar je shop
        </Link>
        <h1>Dit item kan niet meer bewerkt worden</h1>
        <p className="pagina__intro">
          Zodra er een ruilvoorstel over dit item loopt, of het al is geruild of ingetrokken, kan de
          inhoud niet meer gewijzigd worden.
        </p>
      </div>
    )
  }

  const categorieenRes = await payload.find({ collection: 'categories', limit: 200, depth: 0 })
  const huidigeCategorie = typeof item.categorie === 'object' ? (item.categorie as Category) : null
  const huidigeGewenstTerug =
    typeof item.gewenst_terug === 'object' ? (item.gewenst_terug as Category | null) : null
  const bestaandeFotos = item.fotos
    .filter((f): f is Media => typeof f === 'object' && !!f.url)
    .map((f) => ({ id: f.id, url: f.url as string }))
  const overdrachtStandaard =
    item.overdracht.includes('ophalen') && item.overdracht.includes('verzenden')
      ? 'beide'
      : item.overdracht.includes('verzenden')
        ? 'verzenden'
        : 'ophalen'

  const wijzigDitItem = wijzigItem.bind(null, item.id)

  return (
    <div className="pagina pagina--smal">
      <Link href="/shop" className="terug-link">
        ← Terug naar je shop
      </Link>

      <h1>Item bewerken</h1>
      <p className="pagina__intro">
        Pas de gegevens aan. Wijzigingen zijn direct zichtbaar voor andere gebruikers.
      </p>

      <form action={wijzigDitItem} className="item-form">
        <div className="veld">
          <label className="veld__label">Foto&apos;s</label>
          <FotoUploadVeld bestaandeFotos={bestaandeFotos} />
        </div>

        <div className="veld">
          <label className="veld__label" htmlFor="titel">
            Titel *
          </label>
          <input type="text" id="titel" name="titel" required defaultValue={item.titel} />
        </div>

        <div className="veld">
          <label className="veld__label" htmlFor="beschrijving">
            Beschrijving *
          </label>
          <textarea
            id="beschrijving"
            name="beschrijving"
            required
            rows={2}
            defaultValue={item.beschrijving}
          />
        </div>

        <div className="veld">
          <label className="veld__label">Categorie *</label>
          <CategoriePicker
            alleCategorieen={categorieenRes.docs}
            name="categorie"
            standaardCategorie={huidigeCategorie}
          />
        </div>

        <div className="veld">
          <label className="veld__label">Staat *</label>
          <div className="keuze-pillen">
            {Object.entries(STAAT_LABELS).map(([waarde, label]) => (
              <label key={waarde} className="keuze-pil">
                <input
                  type="radio"
                  name="staat"
                  value={waarde}
                  required
                  defaultChecked={item.staat === waarde}
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div className="veld">
          <label className="veld__label">Waarde-indicatie *</label>
          <p className="veld__hint">
            Een grove inschatting, geen prijs. Wordt gebruikt voor de balans-indicator bij
            onderhandelen.
          </p>
          <div className="keuze-pillen">
            {Object.entries(WAARDE_LABELS).map(([waarde, label]) => (
              <label key={waarde} className="keuze-pil">
                <input
                  type="radio"
                  name="waarde_indicatie"
                  value={waarde}
                  required
                  defaultChecked={item.waarde_indicatie === waarde}
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div className="veld">
          <label className="veld__label">Ophalen of verzenden *</label>
          <div className="keuze-pillen">
            <label className="keuze-pil">
              <input
                type="radio"
                name="overdracht_keuze"
                value="ophalen"
                defaultChecked={overdrachtStandaard === 'ophalen'}
              />
              Ophalen
            </label>
            <label className="keuze-pil">
              <input
                type="radio"
                name="overdracht_keuze"
                value="verzenden"
                defaultChecked={overdrachtStandaard === 'verzenden'}
              />
              Verzenden
            </label>
            <label className="keuze-pil">
              <input
                type="radio"
                name="overdracht_keuze"
                value="beide"
                defaultChecked={overdrachtStandaard === 'beide'}
              />
              Beide mogelijk
            </label>
          </div>
        </div>

        <GewenstTerugVeld
          alleCategorieen={categorieenRes.docs}
          standaardCategorie={huidigeGewenstTerug}
        />

        <button type="submit" className="swopla-btn swopla-btn--primair" style={{ width: '100%' }}>
          Wijzigingen opslaan
        </button>
      </form>
    </div>
  )
}
