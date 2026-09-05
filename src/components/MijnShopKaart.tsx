import Link from 'next/link'
import React from 'react'

import { STATUS_LABELS } from '@/lib/ontdekkenFilters'
import type { Media, ShopItem } from '@/payload-types'

export interface MijnShopKaartProps {
  item: ShopItem
}

/**
 * Kaart voor een eigen item op het Shop-scherm -- geen matchscore/afstand (dat is Ontdekken-
 * context, hier bekijk je je eigen aanbod), wel de ruil-status zichtbaar. Linkt naar de
 * gewone Productdetailpagina, die als eigenaar al "Dit is een van je eigen items" toont.
 */
export default function MijnShopKaart({ item }: MijnShopKaartProps) {
  const eersteFoto = item.fotos.find((f): f is Media => typeof f === 'object')

  return (
    <Link href={`/items/${item.id}`} className="product-kaart">
      <div className="product-kaart__afbeelding">
        {eersteFoto?.url && <img src={eersteFoto.url} alt={eersteFoto.alt} />}
        <span className={`status-badge status-badge--${item.status}`}>
          {STATUS_LABELS[item.status] ?? item.status}
        </span>
      </div>
      <div className="product-kaart__body">
        <div className="product-kaart__titel">{item.titel}</div>
        <div className="product-kaart__sub">
          {typeof item.categorie === 'object' ? item.categorie.naam : ''}
        </div>
      </div>
    </Link>
  )
}
