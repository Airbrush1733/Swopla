import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'

const ACCEPTATIE_STATUSSEN = [
  'geaccepteerd_wacht_op_bevestiging',
  'bevestigd_door_a',
  'bevestigd_door_b',
  'voltooid',
]

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
          'Elke statuswijziging mag een Notification triggeren (categorie Ruilvoorstel) — ook tussenstappen, niet alleen de eindstations.',
      },
    },
  ],
}
