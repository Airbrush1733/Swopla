import Link from 'next/link'
import React from 'react'

import { voegItemToe } from './actions'
import CategoriePicker from '@/components/CategoriePicker'
import FotoUploadVeld from '@/components/FotoUploadVeld'
import GewenstTerugVeld from '@/components/GewenstTerugVeld'
import { STAAT_LABELS, WAARDE_LABELS } from '@/lib/ontdekkenFilters'
import { getPayloadClient, getViewer } from '@/lib/viewer'

export default async function ItemToevoegenPage() {
  const viewer = await getViewer()

  if (!viewer) {
    return (
      <div className="pagina">
        <div className="niet-ingelogd-melding">
          Kies hierboven een testgebruiker om een item toe te voegen.
        </div>
      </div>
    )
  }

  const payload = await getPayloadClient()
  const categorieenRes = await payload.find({ collection: 'categories', limit: 200, depth: 0 })

  return (
    <div className="pagina pagina--smal">
      <Link href="/shop" className="terug-link">
        ← Terug naar je shop
      </Link>

      <h1>
        Nieuw item toevoegen aan je shop{' '}
        <span className="titel-ster" aria-hidden="true">
          ★
        </span>
      </h1>
      <p className="pagina__intro">
        Vul de gegevens in. Andere gebruikers zien dit meteen in hun zoekresultaten.
      </p>

      <form action={voegItemToe} className="item-form">
        <div className="veld">
          <label className="veld__label">Foto&apos;s</label>
          <FotoUploadVeld />
        </div>

        <div className="veld">
          <label className="veld__label" htmlFor="titel">
            Titel *
          </label>
          <input
            type="text"
            id="titel"
            name="titel"
            required
            placeholder="bv. Vintage fotocamera"
          />
        </div>

        <div className="veld">
          <label className="veld__label" htmlFor="beschrijving">
            Beschrijving *
          </label>
          <textarea id="beschrijving" name="beschrijving" required rows={2} />
        </div>

        <div className="veld">
          <label className="veld__label">Categorie *</label>
          <CategoriePicker alleCategorieen={categorieenRes.docs} name="categorie" />
        </div>

        <div className="veld">
          <label className="veld__label">Staat *</label>
          <div className="keuze-pillen">
            {Object.entries(STAAT_LABELS).map(([waarde, label]) => (
              <label key={waarde} className="keuze-pil">
                <input type="radio" name="staat" value={waarde} required />
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
                <input type="radio" name="waarde_indicatie" value={waarde} required />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div className="veld">
          <label className="veld__label">Ophalen of verzenden *</label>
          <div className="keuze-pillen">
            <label className="keuze-pil">
              <input type="radio" name="overdracht_keuze" value="ophalen" defaultChecked />
              Ophalen
            </label>
            <label className="keuze-pil">
              <input type="radio" name="overdracht_keuze" value="verzenden" />
              Verzenden
            </label>
            <label className="keuze-pil">
              <input type="radio" name="overdracht_keuze" value="beide" />
              Beide mogelijk
            </label>
          </div>
        </div>

        <GewenstTerugVeld alleCategorieen={categorieenRes.docs} />

        <button type="submit" className="swopla-btn swopla-btn--primair" style={{ width: '100%' }}>
          Item toevoegen aan shop
        </button>
      </form>
    </div>
  )
}
