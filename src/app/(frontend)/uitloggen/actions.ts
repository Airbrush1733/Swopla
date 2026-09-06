'use server'

import { redirect } from 'next/navigation'

import { getPayloadClient } from '@/lib/viewer'
import { wisSessieCookie } from '@/lib/session'

/**
 * Logt de echte, ingelogde gebruiker uit (los van de testgebruiker-cookie, die heeft zijn
 * eigen "Bekijk als (Uitgelogd)"-optie in de Nav-dropdown en blijft ongemoeid).
 */
export async function uitloggen() {
  const payload = await getPayloadClient()
  await wisSessieCookie(payload)
  redirect('/')
}
