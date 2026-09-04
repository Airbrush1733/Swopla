import type { CollectionConfig } from 'payload'

export const Reports: CollectionConfig = {
  slug: 'reports',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['melder', 'onderwerp', 'status'],
    description:
      'Melden = kwade trouw/misbruik. Bewust gescheiden van Disputes (geschil = eerlijk meningsverschil) — nooit samenvoegen.',
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'melder',
      type: 'relationship',
      relationTo: 'users',
      hasMany: false,
      required: true,
    },
    {
      name: 'onderwerp',
      type: 'relationship',
      relationTo: ['users', 'shop-items'],
      hasMany: false,
      required: true,
      admin: {
        description: 'Waarover wordt gemeld — een gebruiker of een specifiek item.',
      },
    },
    {
      name: 'reden',
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
        { label: 'In behandeling', value: 'in_behandeling' },
        { label: 'Afgehandeld', value: 'afgehandeld' },
      ],
      admin: {
        description:
          'Statusopties nog niet expliciet besloten in het concept — eerste redelijke aanname, ter review.',
      },
    },
  ],
}
