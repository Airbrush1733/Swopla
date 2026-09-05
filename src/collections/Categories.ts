import type { CollectionConfig } from 'payload'

export const Categories: CollectionConfig = {
  slug: 'categories',
  admin: {
    useAsTitle: 'naam',
    defaultColumns: ['naam', 'parent', 'slug'],
    description:
      'Vaste, hiërarchische categorieën/tags. Elke knoop is een geldig eindpunt (bv. "Auto\'s" is net zo geldig als "Auto\'s > BMW > 3-serie").',
    // Alle ~68 categorieën (13 hoofd + subs) passen ruim op één pagina. Nodig
    // omdat in-/uitklappen (CategoryNameCell) alleen werkt binnen de rijen die
    // daadwerkelijk op de huidige pagina staan.
    pagination: {
      defaultLimit: 100,
      limits: [25, 50, 100, 200],
    },
  },
  // Sorteert de lijst op slug i.p.v. aanmaakdatum. Een subcategorie-slug begint
  // altijd met de slug van zijn hoofdcategorie (zie scripts/seedCategories.ts),
  // dus dit groepeert elke hoofdcategorie automatisch met zijn subcategorieën
  // direct erna, alfabetisch. Werkt samen met CategoryNameCell (insprong,
  // pijltje, in-/uitklappen).
  defaultSort: 'slug',
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'naam',
      type: 'text',
      required: true,
      admin: {
        components: {
          Cell: '/collections/CategoryNameCell#CategoryNameCell',
        },
      },
    },
    {
      name: 'parent',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: false,
      admin: {
        description: 'Optioneel. Leeg = hoofdcategorie.',
        // In de lijst toont deze kolom het aantal subcategorieën i.p.v. de
        // ruwe parent-relatie — die is al zichtbaar via de insprong/pijltjes
        // in de naam-kolom. Verandert niets aan dit veld in het bewerkscherm,
        // alleen aan de kolomweergave in de lijst.
        components: {
          Cell: '/collections/CategoryChildCountCell#CategoryChildCountCell',
        },
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
