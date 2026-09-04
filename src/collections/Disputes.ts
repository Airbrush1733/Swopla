import type { CollectionConfig } from 'payload'

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
        description: 'Bij status Beslist: dit is het moment dat een Notification (categorie Geschil) triggert.',
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
