import { cookies, headers } from 'next/headers'
import { getPayload } from 'payload'

import config from '@/payload.config'
import type { User } from '@/payload-types'

export const VIEWER_COOKIE = 'swopla_test_viewer'

export async function getPayloadClient() {
  const payloadConfig = await config
  return getPayload({ config: payloadConfig })
}

/**
 * Echte, ingelogde gebruiker (zie /inloggen, /registreren), gelezen via Payload's eigen
 * sessiecookie (payload-token). Los van getViewer() hieronder zodat paginas die specifiek om
 * een ECHTE sessie vragen (bv. de onboarding-intake-gate op de Ontdekken-pagina) dat kunnen
 * onderscheiden van de testgebruiker-cookie.
 */
export async function getEchteGebruiker(): Promise<User | null> {
  const payload = await getPayloadClient()
  try {
    const { user } = await payload.auth({ headers: await headers() })
    if (!user || user.collection !== 'users') return null
    if (user.account_status === 'geanonimiseerd') return null
    return user as User
  } catch {
    return null
  }
}

/**
 * De "actieve" gebruiker voor de rest van de app. Combineert twee bronnen (besloten met Ralph
 * bij het bouwen van login/registratie, zie technische-architectuur-schets.md → "Frontend:
 * Login & registratie"): de tijdelijke testgebruiker-kiezer in de Nav blijft naast echte login
 * bestaan, als snel dev/demo-hulpmiddel om zonder in-/uitloggen tussen testaccounts te
 * wisselen. Als er een testgebruiker gekozen is, wint die expliciete keuze; anders valt dit
 * terug op een echte, ingelogde sessie; anders null (gast).
 */
export async function getViewer(): Promise<User | null> {
  const cookieStore = await cookies()
  const idRaw = cookieStore.get(VIEWER_COOKIE)?.value
  if (idRaw) {
    const id = Number(idRaw)
    if (Number.isFinite(id)) {
      const payload = await getPayloadClient()
      try {
        const gebruiker = await payload.findByID({ collection: 'users', id, depth: 0 })
        if (gebruiker.account_status !== 'geanonimiseerd') return gebruiker
      } catch {
        // Ongeldige/verwijderde testgebruiker-cookie, val hieronder terug op een echte sessie.
      }
    }
  }

  return getEchteGebruiker()
}

/** Lijst voor de testgebruiker-kiezer in de nav, alle niet-geanonimiseerde accounts. */
export async function getTestGebruikers(): Promise<User[]> {
  const payload = await getPayloadClient()
  const resultaat = await payload.find({
    collection: 'users',
    where: { account_status: { not_equals: 'geanonimiseerd' } },
    limit: 50,
    depth: 0,
    sort: 'naam',
  })
  return resultaat.docs
}
