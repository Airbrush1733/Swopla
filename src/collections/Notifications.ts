import type { CollectionConfig } from 'payload'

export const Notifications: CollectionConfig = {
  slug: 'notifications',
  admin: {
    useAsTitle: 'tekst',
    defaultColumns: ['ontvanger', 'categorie', 'tekst', 'createdAt'],
    description:
      'Bewust een beperkte set triggers, geen regel per systeemgebeurtenis. Matches triggeren hier expliciet NIET — dat loopt via een visuele indicator op het productkaartje (mag-later, geen v1-veld).',
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false
      return { ontvanger: { equals: user.id } }
    },
  },
  fields: [
    {
      name: 'ontvanger',
      type: 'relationship',
      relationTo: 'users',
      hasMany: false,
      required: true,
    },
    {
      name: 'categorie',
      type: 'select',
      required: true,
      options: [
        { label: 'Ruilvoorstel', value: 'ruilvoorstel' },
        { label: 'Geschil', value: 'geschil' },
        { label: 'Systeem', value: 'systeem' },
      ],
      admin: {
        description: 'Bepaalt de kleurcodering in de UI: groen / goud / grijs-gemuted.',
      },
    },
    {
      name: 'gerelateerd_voorstel',
      type: 'relationship',
      relationTo: 'trade-proposals',
      hasMany: false,
      admin: {
        condition: (data) => data?.categorie === 'ruilvoorstel',
        description: 'Ingevuld bij categorie Ruilvoorstel.',
      },
    },
    {
      name: 'gerelateerd_geschil',
      type: 'relationship',
      relationTo: 'disputes',
      hasMany: false,
      admin: {
        condition: (data) => data?.categorie === 'geschil',
        description: 'Ingevuld bij categorie Geschil.',
      },
    },
    {
      name: 'tekst',
      type: 'text',
      required: true,
    },
    {
      name: 'gelezen',
      type: 'checkbox',
      defaultValue: false,
    },
  ],
}
