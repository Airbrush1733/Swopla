import type { CollectionConfig } from 'payload'

export const ProposalVersions: CollectionConfig = {
  slug: 'proposal-versions',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['voorstel', 'auteur', 'createdAt'],
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
      name: 'auteur',
      type: 'relationship',
      relationTo: 'users',
      hasMany: false,
      required: true,
      admin: {
        description: 'Wie deze versie voorstelde.',
      },
    },
    {
      name: 'items_van_a',
      type: 'relationship',
      relationTo: 'shop-items',
      hasMany: true,
    },
    {
      name: 'items_van_b',
      type: 'relationship',
      relationTo: 'shop-items',
      hasMany: true,
    },
    {
      name: 'ai_balans_suggestie',
      type: 'text',
      admin: {
        description: 'Wat de lichte AI-onderhandelhulp bij deze versie voorstelde, indien getoond.',
      },
    },
  ],
}
