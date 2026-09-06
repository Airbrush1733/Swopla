import { redirect } from 'next/navigation'
import React from 'react'

import { voltooiOnboarding } from './actions'
import { hoofdcategorieen } from '@/lib/categorieHelpers'
import { getEchteGebruiker, getPayloadClient } from '@/lib/viewer'

/**
 * Verplichte intake na registratie (besloten, zie technische-architectuur-schets.md -> Users,
 * onboarding_voltooid). Alleen relevant voor een echte, nieuw geregistreerde sessie, zie
 * actions.ts hiernaast voor waarom dit getEchteGebruiker() gebruikt i.p.v. getViewer().
 * Interesses op hoofdcategorie-niveau gekozen (bewuste, eenvoudige v1-invulling): het concept
 * noemt interesses zelf als "brede, statische interessegebieden" (bv. "Auto's", "Paardrijden"),
 * dat past bij hoofdcategorieën, een diepe subcategorie kiezen kan altijd nog later via het nog
 * te bouwen profielscherm.
 */
export default async function OnboardingPage() {
  const gebruiker = await getEchteGebruiker()
  if (!gebruiker) {
    redirect('/inloggen')
  }
  if (gebruiker.onboarding_voltooid) {
    redirect('/')
  }

  const payload = await getPayloadClient()
  const categorieenRes = await payload.find({ collection: 'categories', limit: 200, depth: 0 })
  const hoofdcategorieenLijst = hoofdcategorieen(categorieenRes.docs)

  return (
    <div className="pagina pagina--smal">
      <h1>Welkom bij Swopla, {gebruiker.naam}!</h1>
      <p className="pagina__intro">
        Nog twee korte vragen, dan weten we wat we je moeten laten zien op Ontdekken.
      </p>

      <form action={voltooiOnboarding} className="formulier">
        <div className="veld">
          <label className="veld__label" htmlFor="locatie_ruw">
            In welke plaats woon je? *
          </label>
          <input
            type="text"
            id="locatie_ruw"
            name="locatie_ruw"
            required
            placeholder="bv. Amsterdam of 1017 CJ"
          />
          <p className="veld__hint">
            Op wijk-/postcodeniveau, zichtbaar voor anderen. Je precieze adres deel je pas na een
            bevestigde afspraak.
          </p>
        </div>

        <div className="veld">
          <label className="veld__label">Waar heb je interesse in? *</label>
          <p className="veld__hint">Kies minstens 1, je kunt dit later altijd aanpassen.</p>
          <div className="keuze-pillen">
            {hoofdcategorieenLijst.map((categorie) => (
              <label key={categorie.id} className="keuze-pil">
                <input type="checkbox" name="interesses" value={categorie.id} />
                {categorie.naam}
              </label>
            ))}
          </div>
        </div>

        <button type="submit" className="swopla-btn swopla-btn--primair" style={{ width: '100%' }}>
          Naar Ontdekken
        </button>
      </form>
    </div>
  )
}
