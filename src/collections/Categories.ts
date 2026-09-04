import type { CollectionConfig } from 'payload'

export const Categories: CollectionConfig = {
  slug: 'categories',
  admin: {
    useAsTitle: 'naam',
    defaultColumns: ['naam', 'parent', 'slug'],
    description:
      'Vaste, hiërarchische categorieën/tags. Elke knoop is een geldig eindpunt (bv. "Auto\'s" is net zo geldig als "Auto\'s > BMW > 3-serie").',
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'naam',
      type: 'text',
      required: true,
    },
    {
      name: 'parent',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: false,
      admin: {
        description: 'Optioneel. Leeg = hoofdcategorie.',
      },
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'URL-vriendelijke, unieke sleutel.',
      },
    },
  ],
}
