import type { CollectionAfterChangeHook, CollectionConfig } from 'payload'

import { getRelationId } from './hookUtils'

/**
 * Notificatie bij de uitkomst van een geschil (besloten: alleen bij status Beslist,
 * niet bij tussenstappen zoals Geëscaleerd naar team — sluit aan bij het
 * "zo min mogelijk notificaties"-uitgangspunt uit het concept). Gaat naar BEIDE
 * deelnemers van het onderliggende TradeProposal, niet alleen de indiener — de
 * uitkomst raakt beide partijen.
 *
 * `req` wordt overal meegegeven zodat deze aanroepen in dezelfde transactie
 * blijven als de Dispute-wijziging zelf (anders kan de foreign key naar deze
 * nog niet gecommitte Dispute-rij niet worden opgelost — zelfde bug als eerder
 * bij TradeProposals, zie de toelichting daar).
 */
const notificerenBijBeslissing: CollectionAfterChangeHook = async ({ doc, operation, previousDoc, req }) => {
  const wordtBeslist = operation === 'update' && doc.status === 'beslist' && previousDoc?.status !== 'beslist'
  if (!wordtBeslist) {
    return doc
  }

  const voorstelId = getRelationId(doc.voorstel)
  if (typeof voorstelId !== 'number') {
    return doc
  }

  const voorstel = await req.payload.findByID({ collection: 'trade-proposals', id: voorstelId, depth: 0, req })
  const idA = getRelationId(voorstel?.deelnemer_a)
  const idB = getRelationId(voorstel?.deelnemer_b)
  const ontvangers = [idA, idB].filter((id): id is number => typeof id === 'number')

  for (const ontvanger of ontvangers) {
    await req.payload.create({
      collection: 'notifications',
      data: {
        categorie: 'geschil',
        gerelateerd_geschil: doc.id,
        gelezen: false,
        ontvanger,
        tekst: `Geschil #${doc.id} is beslist.`,
      },
      req,
    })
  }

  return doc
}

export const Disputes: CollectionConfig = {
  slug: 'disputes',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['voorstel', 'indiener', 'status'],
    description:
      'Geschil = eerlijk meningsverschil over wat er gebeurd is. Hybride proces (besloten): eerst partijen zelf, bij impasse beslist het platform-team bindend (eBay Resolution Center-model). Exacte termijnen/bewijsvorm/appel nog niet uitgewerkt.',
  },
  access: {
    read: () => true,
  },
  hooks: {
    afterChange: [notificerenBijBeslissing],
  },
  fields: [
    {
      name: 'voorstel',
      type: 'relationship',
      relationTo: 'trade-proposals',
      hasMany: false,
      required: true,
    },
    {
      name: 'indiener',
      type: 'relationship',
      relationTo: 'users',
      hasMany: false,
      required: true,
    },
    {
      name: 'omschrijving',
      type: 'textarea',
      required: true,
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'open',
      options: [
        { label: 'Open', value: 'open' },
        { label: 'In onderling overleg', value: 'in_onderling_overleg' },
        { label: 'Geëscaleerd naar team', value: 'geescaleerd_naar_team' },
        { label: 'Beslist', value: 'beslist' },
        { label: 'Gesloten', value: 'gesloten' },
      ],
      admin: {
        description: 'Bij status Beslist: triggert een Notification (categorie Geschil) naar beide deelnemers.',
      },
    },
    {
      name: 'beoordeeld_door',
      type: 'relationship',
      relationTo: 'users',
      hasMany: false,
      admin: {
        description: 'Optioneel — Swopla-teamlid dat de knoop doorhakt bij escalatie.',
      },
    },
    {
      name: 'beslissing',
      type: 'textarea',
      admin: {
        description: 'Optioneel — toelichting op de bindende beslissing.',
      },
    },
  ],
}
