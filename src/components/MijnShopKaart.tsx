import Link from 'next/link'
import React from 'react'

import { STATUS_LABELS } from '@/lib/ontdekkenFilters'
import type { Media, ShopItem } from '@/payload-types'

export interface MijnShopKaartProps {
  item: ShopItem
}

function OogIcoon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function PotloodIcoon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  )
}

/**
 * Kaart voor een eigen item op het Shop-scherm -- geen matchscore/afstand (dat is Ontdekken-
 * context, hier bekijk je je eigen aanbod), wel de ruil-status zichtbaar.
 *
 * Bewust NIET meer als geheel klikbaar (besloten met Ralph): het risico op per ongeluk
 * doorklikken naar de productpagina bij het snel scannen van je eigen shop woog niet op tegen
 * het nut, de enige echte reden om door te klikken is toch bewerken. In plaats daarvan twee
 * losse, kleine actie-knopjes die pas bij hover over de kaart verschijnen:
 * - Oogje: bekijken zoals de productpagina er ook voor anderen uitziet (die pagina toont
 *   als eigenaar sowieso al "Dit is een van je eigen items" of de binnengekomen
 *   ruilvoorstellen, zie items/[id]/page.tsx). Native title-tooltip bij hover, zelfde patroon
 *   als de andere inert/uitleg-tooltips in dit project (bv. "Bewaren"/"Delen" op Productdetail).
 *   De link krijgt `?van=shop` mee zodat de productpagina de terug-link naar "Je shop" kan
 *   laten wijzen i.p.v. de standaard "Terug naar zoekresultaten" (zie items/[id]/page.tsx).
 * - Potloodje: rechtstreeks naar het bewerkscherm, alleen zichtbaar zolang het item nog
 *   "Beschikbaar" is (voorkomt wijzigen tijdens een lopende ruil, zie shop/[id]/bewerken).
 */
export default function MijnShopKaart({ item }: MijnShopKaartProps) {
  const eersteFoto = item.fotos.find((f): f is Media => typeof f === 'object')
  const magBewerken = item.status === 'beschikbaar'

  return (
    <div className="product-kaart product-kaart--statisch">
      <div className="product-kaart__afbeelding">
        {eersteFoto?.url && <img src={eersteFoto.url} alt={eersteFoto.alt} />}
        <span className={`status-badge status-badge--${item.status}`}>
          {STATUS_LABELS[item.status] ?? item.status}
        </span>
        <div className="mijn-shop-kaart__acties">
          <Link
            href={`/items/${item.id}?van=shop`}
            className="mijn-shop-kaart__actie-knop"
            aria-label="Bekijk product"
            title="Bekijk hoe dit product in de shop wordt getoond"
          >
            <OogIcoon />
          </Link>
          {magBewerken && (
            <Link
              href={`/shop/${item.id}/bewerken`}
              className="mijn-shop-kaart__actie-knop"
              aria-label="Item bewerken"
              title="Item bewerken"
            >
              <PotloodIcoon />
            </Link>
          )}
        </div>
      </div>
      <div className="product-kaart__body">
        <div className="product-kaart__titel">{item.titel}</div>
        <div className="product-kaart__sub">
          {typeof item.categorie === 'object' ? item.categorie.naam : ''}
        </div>
      </div>
    </div>
  )
}
