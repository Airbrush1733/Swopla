'use server'

import { redirect } from 'next/navigation'

import { getPayloadClient } from '@/lib/viewer'
import { zetSessieCookie } from '@/lib/session'

export type WachtwoordResettenState = { error: string | null }

/**
 * Gebruikt useActionState (zie WachtwoordResettenForm.tsx) i.p.v. te gooien met een Error,
 * zelfde reden als bij registreren/actions.ts.
 */
export async function resetWachtwoord(
  _prevState: WachtwoordResettenState,
  formData: FormData,
): Promise<WachtwoordResettenState> {
  const token = String(formData.get('token') ?? '')
  const wachtwoord = String(formData.get('wachtwoord') ?? '')
  const wachtwoordBevestig = String(formData.get('wachtwoord_bevestig') ?? '')

  if (!token) {
    return {
      error: 'Ongeldige of verlopen link, vraag een nieuwe aan via "Wachtwoord vergeten".',
    }
  }
  if (wachtwoord.length < 8) {
    return { error: 'Je wachtwoord moet minstens 8 tekens lang zijn.' }
  }
  if (wachtwoord !== wachtwoordBevestig) {
    return { error: 'De wachtwoorden komen niet overeen.' }
  }

  const payload = await getPayloadClient()

  let nieuwToken: string | undefined
  try {
    const resultaat = await payload.resetPassword({
      collection: 'users',
      data: { token, password: wachtwoord },
      overrideAccess: true,
    })
    nieuwToken = resultaat.token
  } catch {
    return { error: 'Deze link is ongeldig of verlopen, vraag een nieuwe aan.' }
  }

  // Direct inloggen na een geslaagde reset, prettiger dan nog een keer handmatig inloggen.
  if (nieuwToken) {
    await zetSessieCookie(payload, nieuwToken)
  }

  redirect('/')
}
