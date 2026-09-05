'use client'

import React, { useState } from 'react'

import CategoriePicker from '@/components/CategoriePicker'
import type { Category } from '@/payload-types'

export interface GewenstTerugVeldProps {
  alleCategorieen: Category[]
  standaardCategorie?: Category | null
}

/**
 * "Wat wil je hiervoor het liefst terug?": optioneel (zie ShopItems.gewenst_terug: "Leeg =
 * alles mag geboden worden"). Het aanvinkvakje "Alles mag geboden worden" staat standaard aan;
 * pas als je het uitvinkt verschijnt de categorie-picker om een specifieke wens te kiezen. Dit
 * vinkje maakt de standaardstaat (leeg = alles mag) als duidelijke affordance zichtbaar, in
 * plaats van de eerdere link die daarvoor niet duidelijk genoeg was.
 *
 * Krijgt een eigen, geaccentueerde kaart (i.p.v. een vlak veld als de rest). Dit is geen
 * decoratief veld maar het directe, actiefste matchscore-signaal voor dit item (zwaarder dan
 * de algemene Interesses-overlap), dus moet er ook zo uitzien.
 */
export default function GewenstTerugVeld({
  alleCategorieen,
  standaardCategorie = null,
}: GewenstTerugVeldProps) {
  const [allesMag, setAllesMag] = useState(!standaardCategorie)

  return (
    <div className="veld veld--nadruk">
      <div className="veld__nadruk-kop">
        <span className="veld__nadruk-icoon" aria-hidden="true">
          🎯
        </span>
        <label className="veld__label">Wat wil je hiervoor het liefst terug?</label>
      </div>
      <p className="veld__hint">
        Dit is je sterkste match-signaal voor dit item, zelfde categorie-picker als bij Interesses.
        Ingevuld, dan weegt dit zwaarder mee in de match dan de algemene interesses; alles mag
        geboden worden, dan telt de match via interesses gewoon mee.
      </p>
      <label className="alles-mag-checkbox">
        <input type="checkbox" checked={allesMag} onChange={(e) => setAllesMag(e.target.checked)} />
        Alles mag geboden worden
      </label>
      {!allesMag && (
        <CategoriePicker
          alleCategorieen={alleCategorieen}
          name="gewenst_terug"
          standaardCategorie={standaardCategorie}
        />
      )}
    </div>
  )
}
