import Link from 'next/link'
import React from 'react'

import { afstandKm, formatAfstand } from '@/lib/geo'
import { matchBand } from '@/lib/matchscore'
import type { Media, ShopItem, User } from '@/payload-types'

export interface ProductCardProps {
  item: ShopItem
  score: number
  hogeMatchDrempel: number
  bezoekerLocatie: [number, number] | null | undefined
}

export default function ProductCard({
  item,
  score,
  hogeMatchDrempel,
  bezoekerLocatie,
}: ProductCardProps) {
  const eigenaar = typeof item.eigenaar === 'object' ? (item.eigenaar as User) : null
  const eersteFoto = item.fotos.find((f): f is Media => typeof f === 'object')
  const km = afstandKm(bezoekerLocatie, eigenaar?.locatie_exact)

  return (
    <Link href={`/items/${item.id}`} className="product-kaart">
      <div className="product-kaart__afbeelding">
        {eersteFoto?.url && <img src={eersteFoto.url} alt={eersteFoto.alt} />}
        <span className={`match-badge match-badge--${matchBand(score, hogeMatchDrempel)}`}>
          {score}% match
        </span>
      </div>
      <div className="product-kaart__body">
        <div className="product-kaart__titel">{item.titel}</div>
        <div className="product-kaart__sub">
          {eigenaar?.naam ?? 'Onbekend'}
          {km !== null ? ` · ${formatAfstand(km)}` : ''}
        </div>
      </div>
    </Link>
  )
}
