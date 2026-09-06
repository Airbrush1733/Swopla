import type {
  CollectionAfterChangeHook,
  CollectionBeforeChangeHook,
  CollectionConfig,
  PayloadRequest,
} from 'payload'

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
 *
 * **Tijdelijke v1-afwijking (besloten met Ralph bij het bouwen van login/registratie, zie
 * technische-architectuur-schets.md → "Frontend: Login & registratie"):** telefoonverificatie
 * vereist een externe SMS-provider die er nog niet is, dus deze check vereist voor nu alleen
 * `geverifieerd_email`. Zodra telefoonverificatie gebouwd wordt, hier `geverifieerd_telefoon`
 * weer toevoegen aan de voorwaarde.
 */
const checkVerificatie: CollectionBeforeChangeHook = async ({
  data,
  operation,
  req,
  originalDoc,
}) => {
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
    // req meegeven zodat deze read binnen dezelfde transactie blijft als de
    // rest van deze operatie (zie notificerenEnTrackrecordBijwerken hieronder
    // voor waarom dat hier belangrijk is).
    const user = await req.payload.findByID({ collection: 'users', id, depth: 0, req })
    if (!user?.geverifieerd_email) {
      throw new Error(
        `Beide deelnemers moeten hun e-mailadres geverifieerd hebben voordat een ruilvoorstel gestart of geaccepteerd kan worden (gebruiker ${id} voldoet nog niet).`,
      )
    }
  }

  return data
}

/**
 * Verhoogt één trackrecord-teller op Users met 1 (besloten, zie
 * technische-architectuur-schets.md → "Bouwstatus").
 *
 * BELANGRIJK: `req` moet meegegeven worden aan zowel findByID als update, zodat
 * deze aanroepen in dezelfde database-transactie draaien als de TradeProposals-
 * wijziging die dit triggert. Zonder `req` start Payload een eigen transactie
 * die de nog niet gecommitte TradeProposals-rij niet kan zien, wat leidde tot
 * een foreign-key-fout bij het testen (zie Notifications hieronder, zelfde
 * probleem, zelfde fix).
 */
async function verhoogTrackrecordTeller(
  req: PayloadRequest,
  userId: number,
  veld: 'ingetrokken_of_geweigerd' | 'voltooide_ruilen',
): Promise<void> {
  const user = await req.payload.findByID({ collection: 'users', id: userId, depth: 0, req })
  const huidigeWaarde = typeof user?.[veld] === 'number' ? (user[veld] as number) : 0
  await req.payload.update({
    collection: 'users',
    id: userId,
    data: { [veld]: huidigeWaarde + 1 },
    req,
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
 *                   uitvoerde (req.user), niet voor de andere deelnemer
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
    // req meegeven: dit TradeProposal (doc.id) is binnen deze operatie nog niet
    // gecommit, dus de foreign key naar trade-proposals moet in dezelfde
    // transactie blijven om die rij te kunnen zien.
    await req.payload.create({
      collection: 'notifications',
      data: {
        categorie: 'ruilvoorstel',
        gerelateerd_voorstel: doc.id,
        gelezen: false,
        ontvanger,
        tekst: `Ruilvoorstel #${doc.id}: status gewijzigd naar "${STATUS_LABELS[doc.status as string] ?? doc.status}".`,
      },
      req,
    })
  }

  if (doc.status === 'voltooid') {
    for (const id of deelnemers) {
      await verhoogTrackrecordTeller(req, id, 'voltooide_ruilen')
    }
  } else if (doc.status === 'verlopen') {
    for (const id of deelnemers) {
      await verhoogTrackrecordTeller(req, id, 'ingetrokken_of_geweigerd')
    }
  } else if (doc.status === 'ingetrokken') {
    const actorId = getRelationId(req.user)
    if (typeof actorId === 'number' && deelnemers.includes(actorId)) {
      await verhoogTrackrecordTeller(req, actorId, 'ingetrokken_of_geweigerd')
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
      name: 'context_item',
      type: 'relationship',
      relationTo: 'shop-items',
      hasMany: false,
      required: true,
      admin: {
        description:
          'Het item waarvan de productpagina dit ruilvoorstel startte. Elk voorstel draait om precies 1 anker-item (zo toont ook het ruilvoorstel-paneel altijd 1 titel/foto in de header), ongeacht hoeveel items er in latere versies bij komen. deelnemer_a is altijd de eigenaar van dit item ("aanbieder"), deelnemer_b altijd wie het voorstel startte ("zoeker").',
      },
    },
    {
      name: 'deelnemer_a',
      type: 'relationship',
      relationTo: 'users',
      hasMany: false,
      required: true,
      admin: {
        description: 'Eigenaar van context_item ("aanbieder"), zie context_item hierboven.',
      },
    },
    {
      name: 'deelnemer_b',
      type: 'relationship',
      relationTo: 'users',
      hasMany: false,
      required: true,
      admin: {
        description: 'Wie het voorstel startte ("zoeker"), zie context_item hierboven.',
      },
    },
    {
      name: 'akkoord_door',
      type: 'relationship',
      relationTo: 'users',
      hasMany: false,
      admin: {
        description:
          'Wie als eerste op "Akkoord geven" klikte (status geaccepteerd_wacht_op_bevestiging). De ANDERE deelnemer moet dit vervolgens zelf bevestigen voordat status voltooid wordt. Leeg zolang niemand akkoord heeft gegeven; wordt weer leeggemaakt bij weigeren/sluiten.',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'voorgesteld',
      options: [
        { label: 'Voorgesteld', value: 'voorgesteld' },
        { label: 'In onderhandeling', value: 'in_onderhandeling' },
        {
          label: 'Geaccepteerd - wacht op bevestiging',
          value: 'geaccepteerd_wacht_op_bevestiging',
        },
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
