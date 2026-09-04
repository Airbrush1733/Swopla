import type { CollectionConfig } from 'payload'

export const ShopItems: CollectionConfig = {
  slug: 'shop-items',
  admin: {
    useAsTitle: 'titel',
    defaultColumns: ['titel', 'eigenaar', 'categorie', 'status'],
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'eigenaar',
      type: 'relationship',
      relationTo: 'users',
      hasMany: false,
      required: true,
    },
    {
      name: 'titel',
      type: 'text',
      required: true,
    },
    {
      name: 'beschrijving',
      type: 'textarea',
      required: true,
    },
    {
      name: 'categorie',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: false,
      required: true,
      admin: {
        description: 'Voedt de matchscore-factor "aanbod-vraag overlap" tegen Users.interesses van anderen.',
      },
    },
    {
      name: 'fotos',
      type: 'upload',
      relationTo: 'media',
      hasMany: true,
      minRows: 1,
      required: true,
    },
    {
      name: 'staat',
      type: 'select',
      required: true,
      options: [
        { label: 'Nieuwstaat', value: 'nieuwstaat' },
        { label: 'Zo goed als nieuw', value: 'zo_goed_als_nieuw' },
        { label: 'Gebruikssporen', value: 'gebruikssporen' },
        { label: 'Duidelijke gebruikssporen', value: 'duidelijke_gebruikssporen' },
      ],
    },
    {
      name: 'waarde_indicatie',
      type: 'select',
      required: true,
      options: [
        { label: 'Laag', value: 'laag' },
        { label: 'Midden', value: 'midden' },
        { label: 'Hoog', value: 'hoog' },
      ],
      admin: {
        description: 'Nooit een prijs — vaste schaal, geen prijsrange of vrije tekst.',
      },
    },
    {
      name: 'overdracht',
      type: 'select',
      required: true,
      hasMany: true,
      options: [
        { label: 'Ophalen', value: 'ophalen' },
        { label: 'Verzenden', value: 'verzenden' },
      ],
      admin: {
        description: '"Beide mogelijk" = beide opties selecteren. Voedt locatie-weging in de matchscore.',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'beschikbaar',
      options: [
        { label: 'Beschikbaar', value: 'beschikbaar' },
        { label: 'In onderhandeling', value: 'in_onderhandeling' },
        { label: 'Geruild', value: 'geruild' },
        { label: 'Ingetrokken', value: 'ingetrokken' },
      ],
      admin: {
        description:
          'Een item blijft open voor meerdere gelijktijdige voorstellen; dit veld is de ruil-levenscyclus van een al gepubliceerd item (geen concept/draft-staat — die volgt later apart).',
      },
    },
    {
      name: 'gewenst_terug',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: false,
      admin: {
        description:
          'Wat de aanbieder voor dit item het liefst terugkrijgt. Leeg = alles mag geboden worden; productmatch valt dan terug op categorie/Interesses-overlap. Bewust geen apart boolean-veld.',
      },
    },
  ],
}
