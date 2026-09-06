'use server'

import { redirect } from 'next/navigation'

import { getEchteGebruiker, getPayloadClient } from '@/lib/viewer'

/**
 * Rondt de verplichte intake af (besloten, zie technische-architectuur-schets.md -> Users,
 * onboarding_voltooid): interesses + locatie. Expliciet gekoppeld aan de ECHTE, ingelogde
 * sessie (niet getViewer(), die ook de testgebruiker-cookie meeneemt) -- de intake-gate op de
 * Ontdekken-pagina geldt alleen voor echte, nieuw geregistreerde accounts, niet voor Ralphs
 * testgebruikers.
 */
export async function voltooiOnboarding(formData: FormData) {
  const gebruiker = await getEchteGebruiker()
  if (!gebruiker) {
    redirect('/inloggen')
  }

  const locatieRuw = String(formData.get('locatie_ruw') ?? '').trim()
  const interesseIds = formData
    .getAll('interesses')
    .map((waarde) => Number(waarde))
    .filter((id) => Number.isFinite(id))

  if (!locatieRuw) {
    throw new Error('Vul een plaats of postcode in.')
  }
  if (interesseIds.length === 0) {
    throw new Error('Kies minstens 1 interesse.')
  }

  const payload = await getPayloadClient()
  await payload.update({
    collection: 'users',
    id: gebruiker.id,
    data: {
      locatie_ruw: locatieRuw,
      interesses: interesseIds,
      onboarding_voltooid: true,
    },
  })

  redirect('/')
}
