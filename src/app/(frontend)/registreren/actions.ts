'use server'

import { headers as nextHeaders } from 'next/headers'
import { redirect } from 'next/navigation'
import { ValidationError } from 'payload'

import { getPayloadClient } from '@/lib/viewer'

export type RegistrerenState = { error: string | null }

/**
 * Registreert een nieuw, echt account (zie technische-architectuur-schets.md -> "Frontend:
 * Login & registratie"). Payload's auth.verify (Users.ts) zorgt automatisch voor de
 * verificatie-e-mail zodra dit record wordt aangemaakt, en blokkeert inloggen zolang die niet
 * bevestigd is.
 *
 * Gebruikt useActionState (zie RegistrerenForm.tsx) i.p.v. te gooien met een Error: een
 * geworpen Error in een form action liet Next.js zijn ingebouwde, volledige foutpagina tonen
 * i.p.v. een nette melding in het formulier zelf bij een verwachte fout zoals "e-mailadres al
 * in gebruik". Onverwachte fouten (bv. een database die niet bereikbaar is) worden hieronder
 * nog steeds als een nette melding teruggegeven i.p.v. gegooid, voor consistentie.
 */
export async function registreer(
  _prevState: RegistrerenState,
  formData: FormData,
): Promise<RegistrerenState> {
  const naam = String(formData.get('naam') ?? '').trim()
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase()
  const wachtwoord = String(formData.get('wachtwoord') ?? '')
  const wachtwoordBevestig = String(formData.get('wachtwoord_bevestig') ?? '')

  if (!naam || !email || !wachtwoord) {
    return { error: 'Vul alle velden in.' }
  }
  if (wachtwoord.length < 8) {
    return { error: 'Je wachtwoord moet minstens 8 tekens lang zijn.' }
  }
  if (wachtwoord !== wachtwoordBevestig) {
    return { error: 'De wachtwoorden komen niet overeen.' }
  }

  const payload = await getPayloadClient()

  // Voor sockpuppet-/collusiedetectie (Users.signup_device_ip, intern veld, zie
  // technische-architectuur-schets.md -> Users). Best-effort: als de header ontbreekt (lokale
  // dev), blijft dit veld leeg, geen harde eis.
  const headerLijst = await nextHeaders()
  const ip = headerLijst.get('x-forwarded-for')?.split(',')[0]?.trim() || ''

  try {
    await payload.create({
      collection: 'users',
      data: {
        naam,
        email,
        password: wachtwoord,
        signup_device_ip: ip,
      },
    })
  } catch (err) {
    // Bug gevonden en opgelost (zie chat met Ralph over "nannysuwanspring@gmail.com is al in
    // gebruik" terwijl dat adres niet in de database stond): de oude check keek simpelweg of
    // de foutmelding het woord "email" of "unique" bevatte, wat OOK toesloeg als het aanmaken
    // zelf lukte maar het versturen van de verificatiemail daarna faalde (bv. Resend die in
    // sandbox-modus alleen naar het eigen Resend-accountadres mag versturen, zie
    // technische-architectuur-schets.md -> "Frontend: Login & registratie"), Payload rolt de
    // net aangemaakte rij dan terug binnen dezelfde transactie, dus de gebruiker leek nooit te
    // hebben bestaan terwijl de melding toch "al in gebruik" zei. Nu een precieze check op
    // Payload's eigen ValidationError met een fout specifiek op het "email"-veld, niet op de
    // foutmelding-tekst.
    const isEmailAlIngebruik =
      err instanceof ValidationError &&
      Array.isArray(err.data?.errors) &&
      err.data.errors.some((veldFout) => veldFout?.path === 'email')
    if (isEmailAlIngebruik) {
      return {
        error:
          'Dit e-mailadres is al in gebruik. Probeer in te loggen in plaats van te registreren.',
      }
    }
    return { error: 'Registreren is niet gelukt, probeer het opnieuw.' }
  }

  redirect('/registreren/bevestig-email')
}
