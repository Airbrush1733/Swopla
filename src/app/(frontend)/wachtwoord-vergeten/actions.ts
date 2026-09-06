'use server'

import { redirect } from 'next/navigation'

import { getPayloadClient } from '@/lib/viewer'

export type WachtwoordVergetenState = { error: string | null }

/**
 * Payload's forgotPassword faalt bewust stil als het e-mailadres niet bestaat (voorkomt het
 * lekken van geregistreerde e-mailadressen), dus we tonen altijd dezelfde bevestiging,
 * ongeacht of er echt een e-mail is verstuurd.
 *
 * Gebruikt useActionState (zie WachtwoordVergetenForm.tsx) i.p.v. te gooien met een Error,
 * zelfde reden als bij registreren/actions.ts. Ontbrekende try/catch hier was een gat van
 * dezelfde soort als de bug bij registreren (zie chat met Ralph): forgotPassword verstuurt ook
 * een e-mail (via Resend), en een falende verzending (bv. de Resend-sandboxbeperking, zie
 * technische-architectuur-schets.md -> "Frontend: Login & registratie") zou zonder try/catch
 * ongevangen naar Next.js' volledige foutpagina crashen, precies wat deze hele bouwronde juist
 * moest voorkomen.
 */
export async function vraagResetAan(
  _prevState: WachtwoordVergetenState,
  formData: FormData,
): Promise<WachtwoordVergetenState> {
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase()
  if (!email) {
    return { error: 'Vul je e-mailadres in.' }
  }

  const payload = await getPayloadClient()
  try {
    await payload.forgotPassword({ collection: 'users', data: { email } })
  } catch {
    return { error: 'Er ging iets mis, probeer het later opnieuw.' }
  }

  redirect('/wachtwoord-vergeten/verstuurd')
}
