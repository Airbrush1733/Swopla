'use server'

import { redirect } from 'next/navigation'

import { getPayloadClient } from '@/lib/viewer'
import { zetSessieCookie } from '@/lib/session'

export type InloggenState = { error: string | null }

/**
 * Alleen relatieve, eigen paden toestaan als "next"-doel na inloggen, ter voorkoming van een
 * open-redirect via een gemanipuleerde queryparam (bv. next=https://evil.example).
 */
function veiligNextPad(waarde: FormDataEntryValue | null): string {
  const pad = String(waarde ?? '')
  if (pad.startsWith('/') && !pad.startsWith('//')) return pad
  return '/'
}

/**
 * Logt in met Payload's Local API en zet vervolgens zelf de sessiecookie, het gedocumenteerde
 * patroon voor een custom Next.js-frontend bovenop Payload (zie
 * technische-architectuur-schets.md -> "Frontend: Login & registratie"). Payload blokkeert dit
 * zelf al met een duidelijke fout als het account nog niet geverifieerd is (auth.verify op
 * Users.ts), geen extra check hier nodig.
 *
 * Gebruikt useActionState (zie InloggenForm.tsx) i.p.v. te gooien met een Error, zelfde reden
 * als bij registreren/actions.ts: een nette inline melding i.p.v. Next.js' volledige
 * foutpagina bij een verwachte fout zoals "wachtwoord onjuist".
 */
export async function login(_prevState: InloggenState, formData: FormData): Promise<InloggenState> {
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase()
  const wachtwoord = String(formData.get('wachtwoord') ?? '')
  const next = veiligNextPad(formData.get('next'))

  if (!email || !wachtwoord) {
    return { error: 'Vul je e-mailadres en wachtwoord in.' }
  }

  const payload = await getPayloadClient()

  let token: string | undefined
  try {
    const result = await payload.login({
      collection: 'users',
      data: { email, password: wachtwoord },
    })
    token = result.token
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (message.toLowerCase().includes('verify') || message.toLowerCase().includes('verif')) {
      return {
        error:
          'Je account is nog niet geverifieerd. Check je inbox voor de bevestigingslink die je bij registratie hebt gekregen.',
      }
    }
    return { error: 'E-mailadres of wachtwoord onjuist.' }
  }

  if (!token) {
    return { error: 'Inloggen is niet gelukt, probeer het opnieuw.' }
  }

  await zetSessieCookie(payload, token)

  redirect(next)
}
