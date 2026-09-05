import type { CollectionAfterChangeHook, CollectionBeforeChangeHook, CollectionConfig, Payload } from 'payload'

import { getRelationId } from './hookUtils'

const ACCEPTATIE_STATUSSEN = [
  'geaccepteerd_wacht_op_bevestiging',
  'bevestigd_door_a',
  'bevestigd_door_b',
  'voltooid',
]

const STATUS_LABELS: Record<string, string> = {
  bevestigd_door_a: 'Bevestigd door deelnemer A',
  bevestigd_door_b: 'Bevestigd door deelnemer B',
  geaccepteerd_wacht_op_bevestiging: 'Geaccepteerd - wacht op bevestiging',
  geweigerd: 'Geweigerd',
  in_onderhandeling: 'In onderhandeling',
  ingetrokken: 'Ingetrokken',
  verlopen: 'Verlopen',
  voltooid: 'Voltooid',
  voorgesteld: 'Voorgesteld',
}

/**
 * Verplichte verificatie voor een ruilvoorstel (besloten, zie concept-samenvatting.md →
 * "Verificatieproces"): e-mail + telefoon moeten voor BEIDE deelnemers geverifieerd zijn
 * voordat een TradeProposal gestart (create) of geaccepteerd (status → acceptatie-statussen)
 * mag worden. Dit is een validatieregel, geen apart schemaveld.
 */
const checkVerificatie: CollectionBeforeChangeHook = async ({ data, operation, req, originalDoc }) => {
  const wordtGestart = operation === 'create'
  const wordtGeaccepteerd =
    operation === 'update' &&
    typeof data.status === 'string' &&
    ACCEPTATIE_STATUSSEN.includes(data.status) &&
    data.status !== originalDoc?.status

  if (!wordtGestart && !wordtGeaccepteerd) return data

  const idA = typeof data.deelnemer_a === 'object' ? data.deelnemer_a?.id : data.deelnemer_a
  const idB = typeof data.deelnemer_b === 'object' ? data.deelnemer_b?.id : data.deelnemer_b

  for (const id of [idA, idB]) {
    if (!id) continue
    const user = await req.payload.findByID({ collection: 'users', id, depth: 0 })
    if (!user?.geverifieerd_email || !user?.geverifieerd_telefoon) {
      throw new Error(
        `Beide deelnemers moeten e-mail én telefoon geverifieerd hebben voordat een ruilvoorstel gestart of geaccepteerd kan worden (gebruiker ${id} voldoet nog niet).`,
      )
    }
  }

  return data
}

/**
 * Verhoogt één trackrecord-teller op Users met 1 (besloten, zie
 * technische-architectuur-schets.md → "Bouwstatus").
 */
async function verhoogTrackrecordTeller(
  payload: Payload,
  userId: number,
  veld: 'ingetrokken_of_geweigerd' | 'voltooide_ruilen',
): Promise<void> {
  const user = await payload.findByID({ collection: 'users', id: userId, depth: 0 })
  const huidigeWaarde = typeof user?.[veld] === 'number' ? (user[veld] as number) : 0
  await payload.update({
    collection: 'users',
    id: userId,
    data: { [veld]: huidigeWaarde + 1 },
  })
}

/**
 * Notificaties bij elke statuswijziging (besloten: ook tussenstappen, niet alleen
 * de eindstations) + de trackrecord-tellers op Users. Beide lopen hier samen omdat
 * ze dezelfde trigger delen (een statusverandering op TradeProposals).
 *
 * Trackrecord-regels (expliciet besloten, niet aangenomen):
 * - voltooid      → +1 voltooide_ruilen voor BEIDE deelnemers
 * - verlopen      → +1 ingetrokken_of_geweigerd voor BEIDE deelnemers (geen van
 *                   beiden heeft het afgerond)
 * - ingetrokken   → +1 ingetrokken_of_geweigerd, maar ALLEEN voor wie de actie
 *                   uitvoerde (req.user) — niet voor de andere deelnemer
 * - geweigerd     → GEEN teller-impact (geweigerd worden is geen
 *                   onbetrouwbaarheidssignaal, gewoon onderhandelen)
 */
const notificerenEnTrackrecordBijwerken: CollectionAfterChangeHook = async ({
  doc,
  operation,
  previousDoc,
  req,
}) => {
  const statusVeranderd = operation === 'create' || doc.status !== previousDoc?.status
  if (!statusVeranderd) {
    return doc
  }

  const idA = getRelationId(doc.deelnemer_a)
  const idB = getRelationId(doc.deelnemer_b)
  const deelnemers = [idA, idB].filter((id): id is number => typeof id === 'number')

  for (const ontvanger of deelnemers) {
    await req.payload.create({
      collection: 'notifications',
      data: {
        categorie: 'ruilvoorstel',
        gerelateerd_voorstel: doc.id,
        gelezen: false,
        ontvanger,
        tekst: `Ruilvoorstel #${doc.id}: status gewijzigd naar "${STATUS_LABELS[doc.status as string] ?? doc.status}".`,
      },
    })
  }

  if (doc.status === 'voltooid') {
    for (const id of deelnemers) {
      await verhoogTrackrecordTeller(req.payload, id, 'voltooide_ruilen')
    }
  } else if (doc.status === 'verlopen') {
    for (const id of deelnemers) {
      await verhoogTrackrecordTeller(req.payload, id, 'ingetrokken_of_geweigerd')
    }
  } else if (doc.status === 'ingetrokken') {
    const actorId = getRelationId(req.user)
    if (typeof actorId === 'number' && deelnemers.includes(actorId)) {
      await verhoogTrackrecordTeller(req.payload, actorId, 'ingetrokken_of_geweigerd')
    }
  }

  return doc
}

export const TradeProposals: CollectionConfig = {
  slug: 'trade-proposals',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['deelnemer_a', 'deelnemer_b', 'status'],
  },
  access: {
    read: () => true,
  },
  hooks: {
    afterChange: [notificerenEnTrackrecordBijwerken],
    beforeChange: [checkVerificatie],
  },
  fields: [
    {
      name: 'deelnemer_a',
      type: 'relationship',
      relationTo: 'users',
      hasMany: false,
      required: true,
    },
    {
      name: 'deelnemer_b',
      type: 'relationship',
      relationTo: 'users',
      hasMany: false,
      required: true,
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'voorgesteld',
      options: [
        { label: 'Voorgesteld', value: 'voorgesteld' },
        { label: 'In onderhandeling', value: 'in_onderhandeling' },
        { label: 'Geaccepteerd - wacht op bevestiging', value: 'geaccepteerd_wacht_op_bevestiging' },
        { label: 'Bevestigd door A', value: 'bevestigd_door_a' },
        { label: 'Bevestigd door B', value: 'bevestigd_door_b' },
        { label: 'Voltooid', value: 'voltooid' },
        { label: 'Geweigerd', value: 'geweigerd' },
        { label: 'Ingetrokken', value: 'ingetrokken' },
        { label: 'Verlopen', value: 'verlopen' },
      ],
      admin: {
        description:
          'Elke statuswijziging triggert een Notification (categorie Ruilvoorstel) en, bij voltooid/verlopen/ingetrokken, een trackrecord-teller op Users (zie hooks in dit bestand).',
      },
    },
  ],
}
