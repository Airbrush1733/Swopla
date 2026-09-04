import type { CollectionConfig } from 'payload'

export const ProposalMessages: CollectionConfig = {
  slug: 'proposal-messages',
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
    },
    {
      name: 'tekst',
      type: 'textarea',
      required: true,
    },
  ],
}
