import Link from 'next/link'
import React from 'react'

import type { ShopInzichten } from '@/lib/shopInzichten'

function InzichtenIcoon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3 13V7M8 13V3M13 13V9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

export interface InzichtenZijbalkProps {
  inzichten: ShopInzichten
  potentieleMatches: number
}

/**
 * Rechter Inzichten-zijbalk op het Shop-scherm (zie concept-samenvatting.md). Vier kaarten:
 * weergaven-deze-maand + trend, potentiële matches, meest bekeken item, en de categorieën-
 * spreiding van de eigen shop. Het concept-doc noemt de exacte databron/berekening van elke
 * metric nog "illustratief" -- de hier gekozen berekeningen (zie lib/shopInzichten.ts) zijn
 * dus een eerste redelijke invulling, geen vastgelegde definitie.
 */
export default function InzichtenZijbalk({ inzichten, potentieleMatches }: InzichtenZijbalkProps) {
  const { weergavenDezeMaand, trendPercentage, meestBekekenItem, categorieen } = inzichten

  return (
    <aside className="inzichten">
      <div className="inzichten__titel">
        <InzichtenIcoon /> Inzichten
      </div>

      <div className="inzichten-kaart">
        <div className="inzichten-kaart__label">Weergaven deze maand</div>
        <div className="inzichten-kaart__cijfer">{weergavenDezeMaand}</div>
        {trendPercentage !== null && (
          <div
            className={`inzichten-kaart__trend${trendPercentage < 0 ? ' inzichten-kaart__trend--negatief' : trendPercentage > 0 ? ' inzichten-kaart__trend--positief' : ''}`}
          >
            {trendPercentage > 0 ? '↑' : trendPercentage < 0 ? '↓' : '·'}{' '}
            {Math.abs(trendPercentage)}% t.o.v. vorige maand
          </div>
        )}
      </div>

      <div className="inzichten-kaart">
        <div className="inzichten-kaart__label">Potentiële matches</div>
        <div className="inzichten-kaart__cijfer">{potentieleMatches}</div>
        <div className="inzichten-kaart__sub">
          Gebruikers met interesse in wat jouw shop te bieden heeft.
        </div>
      </div>

      <div className="inzichten-kaart">
        <div className="inzichten-kaart__label">Meest bekeken item</div>
        {meestBekekenItem ? (
          <>
            <Link href={`/items/${meestBekekenItem.item.id}`} className="inzichten-kaart__link">
              {meestBekekenItem.item.titel}
            </Link>
            <div className="inzichten-kaart__sub">{meestBekekenItem.weergaven} weergaven</div>
          </>
        ) : (
          <div className="inzichten-kaart__sub">Nog geen weergaven.</div>
        )}
      </div>

      <div className="inzichten-kaart">
        <div className="inzichten-kaart__label">Categorieën in je shop</div>
        {categorieen.length > 0 ? (
          <>
            <div className="inzichten-kaart__chips">
              {categorieen.map((c) => (
                <span key={c.id} className="categorie-chip">
                  {c.naam}
                </span>
              ))}
            </div>
            {categorieen.length < 3 && (
              <div className="inzichten-kaart__sub">
                Een bredere spreiding aan categorieën vergroot je kans op een match.
              </div>
            )}
          </>
        ) : (
          <div className="inzichten-kaart__sub">Nog geen items in je shop.</div>
        )}
      </div>
    </aside>
  )
}
