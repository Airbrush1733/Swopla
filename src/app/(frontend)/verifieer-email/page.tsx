import Link from 'next/link'
import React from 'react'

import { getPayloadClient } from '@/lib/viewer'

/**
 * Landingspagina voor de link uit de verificatie-e-mail (zie Users.ts -> auth.verify voor de
 * e-mailinhoud). Dit is een GET-link-klik, geen formulier-submit, dus de verificatie gebeurt
 * hier direct in de server component i.p.v. via een 'use server'-action, zelfde soort
 * uitzondering als de directe payload.create()-aanroep voor ItemViews-logging in
 * items/[id]/page.tsx.
 *
 * Payload's verifyEmail-operatie schrijft _verified rechtstreeks via de database-adapter en
 * slaat daarbij collectie-hooks over, dus onze eigen geverifieerd_email-veld (dat elders in
 * de app gebruikt wordt, o.a. de verificatie-check in TradeProposals.ts) wordt hier bewust
 * apart, expliciet bijgewerkt na een geslaagde verificatie.
 */
export default async function VerifieerEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams

  if (!token) {
    return (
      <div className="pagina pagina--smal">
        <h1>Ongeldige link</h1>
        <p className="pagina__intro">Er ontbreekt een verificatiecode in deze link.</p>
      </div>
    )
  }

  const payload = await getPayloadClient()

  const gevonden = await payload.find({
    collection: 'users',
    where: { _verificationToken: { equals: token } },
    limit: 1,
    depth: 0,
  })
  const gebruiker = gevonden.docs[0]

  if (!gebruiker) {
    return (
      <div className="pagina pagina--smal">
        <h1>Deze link is niet (meer) geldig</h1>
        <p className="pagina__intro">
          Mogelijk heb je je account al eerder bevestigd, of is de link verlopen. Probeer in te
          loggen, of registreer opnieuw als dat niet lukt.
        </p>
        <Link href="/inloggen" className="swopla-btn swopla-btn--primair">
          Naar inloggen
        </Link>
      </div>
    )
  }

  try {
    await payload.verifyEmail({ collection: 'users', token })
  } catch {
    return (
      <div className="pagina pagina--smal">
        <h1>Verificatie mislukt</h1>
        <p className="pagina__intro">
          Deze link kon niet worden verwerkt. Probeer opnieuw te registreren of neem contact op.
        </p>
      </div>
    )
  }

  await payload.update({
    collection: 'users',
    id: gebruiker.id,
    data: { geverifieerd_email: true },
  })

  return (
    <div className="pagina pagina--smal">
      <h1>E-mailadres bevestigd</h1>
      <p className="pagina__intro">Je account is geactiveerd. Je kunt nu inloggen.</p>
      <Link href="/inloggen" className="swopla-btn swopla-btn--primair">
        Naar inloggen
      </Link>
    </div>
  )
}
