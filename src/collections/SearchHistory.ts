import type { CollectionConfig } from 'payload'

export const SearchHistory: CollectionConfig = {
  slug: 'search-history',
  admin: {
    useAsTitle: 'zoekterm',
    defaultColumns: ['gebruiker', 'zoekterm', 'createdAt'],
    description:
      'Dit is ook de plek waar specifiek, actueel zoeken landt, vervangt het vervallen WishlistItems (zie Categories/Users.interesses voor het brede, statische signaal).',
  },
  access: {
    // Alleen zichtbaar voor de gebruiker zelf.
    read: ({ req: { user } }) => {
      if (!user) return false
      return { gebruiker: { equals: user.id } }
    },
  },
  fields: [
    {
      name: 'gebruiker',
      type: 'relationship',
      relationTo: 'users',
      hasMany: false,
      required: true,
    },
    {
      name: 'zoekterm',
      type: 'text',
      required: true,
    },
    {
      name: 'filters',
      type: 'json',
    },
  ],
}
