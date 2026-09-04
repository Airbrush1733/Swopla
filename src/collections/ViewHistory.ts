import type { CollectionConfig } from 'payload'

export const ViewHistory: CollectionConfig = {
  slug: 'view-history',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['kijker', 'bekeken_profiel', 'createdAt'],
  },
  access: {
    // Alleen zichtbaar voor de kijker zelf.
    read: ({ req: { user } }) => {
      if (!user) return false
      return { kijker: { equals: user.id } }
    },
  },
  fields: [
    {
      name: 'kijker',
      type: 'relationship',
      relationTo: 'users',
      hasMany: false,
      required: true,
    },
    {
      name: 'bekeken_profiel',
      type: 'relationship',
      relationTo: 'users',
      hasMany: false,
      required: true,
    },
  ],
}
