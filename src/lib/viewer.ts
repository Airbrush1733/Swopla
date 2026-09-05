import { cookies } from 'next/headers'
import { getPayload } from 'payload'

import config from '@/payload.config'
import type { User } from '@/payload-types'

export const VIEWER_COOKIE = 'swopla_test_viewer'

export async function getPayloadClient() {
  const payloadConfig = await config
  return getPayload({ config: payloadConfig })
}

/**
 * Tijdelijke "bekijk als testgebruiker"-vervanging voor echte login (goedgekeurd door
 * Ralph als tussenoplossing, zie technische-architectuur-schets.md). Er bestaat nog geen
 * publieke registratie/login-flow — dit leest alleen een cookie met een user-id, geen
 * echte sessie/wachtwoordcontrole. Moet vervangen worden zodra echte auth gebouwd wordt.
 */
export async function getViewer(): Promise<User | null> {
  const cookieStore = await cookies()
  const idRaw = cookieStore.get(VIEWER_COOKIE)?.value
  if (!idRaw) return null
  const id = Number(idRaw)
  if (!Number.isFinite(id)) return null

  const payload = await getPayloadClient()
  try {
    const gebruiker = await payload.findByID({ collection: 'users', id, depth: 0 })
    if (gebruiker.account_status === 'geanonimiseerd') return null
    return gebruiker
  } catch {
    return null
  }
}

/** Lijst voor de testgebruiker-kiezer in de nav — alle niet-geanonimiseerde accounts. */
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
