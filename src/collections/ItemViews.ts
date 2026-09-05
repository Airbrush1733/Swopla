import type { CollectionConfig } from 'payload'

/**
 * Eén record per weergave van een shop-item (log, geen lopende teller), analoog aan
 * ViewHistory, maar dan voor items i.p.v. profielen. Log-vorm is nodig omdat de Inzichten-
 * zijbalk op het Shop-scherm "weergaven deze maand (met trend t.o.v. vorige maand)" toont:
 * een trend is met één cumulatief getal niet te berekenen, wel door records per maand te
 * groeperen op `createdAt` (automatisch door Payload gezet, geen handmatig datumveld).
 *
 * Sluit ook de eerder gesignaleerde "X keer bekeken"-leemte op Productdetail.
 *
 * `eigenaar` is gedenormaliseerd vanaf `item.eigenaar` op het moment van bekijken (via de
 * beforeChange-hook hieronder), zodat de leestoegang en de maand-aggregaties geen join naar
 * shop-items nodig hebben.
 *
 * Bewuste keuze: de aanroepende code (Productdetail) telt een view NIET mee wanneer de
 * kijker de eigenaar van het item zelf is. Dat voorkomt dat eigen bezoekjes de eigen
 * weergave-telling opblazen. Zie items/[id]/page.tsx.
 */
export const ItemViews: CollectionConfig = {
  slug: 'item-views',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['item', 'eigenaar', 'kijker', 'createdAt'],
    description:
      'Log van weergaven per shop-item, voor "X keer bekeken" en de Inzichten-zijbalk (weergaven + trend) op het Shop-scherm.',
  },
  access: {
    // Alleen zichtbaar voor de eigenaar van het bekeken item.
    read: ({ req: { user } }) => {
      if (!user) return false
      return { eigenaar: { equals: user.id } }
    },
  },
  fields: [
    {
      name: 'item',
      type: 'relationship',
      relationTo: 'shop-items',
      hasMany: false,
      required: true,
    },
    {
      name: 'eigenaar',
      type: 'relationship',
      relationTo: 'users',
      hasMany: false,
      // Niet `required` op schemaniveau: het veld wordt altijd gevuld door de
      // beforeChange-hook hieronder (vanaf item.eigenaar), maar Payloads gegenereerde
      // TypeScript-type voor `data` zou anders verplicht eisen dat de aanroeper het zelf
      // meegeeft. De hook garandeert dat het nooit leeg blijft staan.
      admin: {
        description: 'Automatisch gezet vanaf item.eigenaar, niet handmatig invullen.',
        readOnly: true,
      },
    },
    {
      name: 'kijker',
      type: 'relationship',
      relationTo: 'users',
      hasMany: false,
      required: false,
      admin: {
        description:
          'Optioneel: er is nog geen echte auth, dus niet elke weergave heeft een bekende kijker.',
      },
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, req }) => {
        if (!data?.eigenaar && data?.item) {
          const itemId = typeof data.item === 'object' ? data.item.id : data.item
          const itemDoc = await req.payload.findByID({
            collection: 'shop-items',
            id: itemId,
            depth: 0,
          })
          data.eigenaar =
            typeof itemDoc.eigenaar === 'object' ? itemDoc.eigenaar.id : itemDoc.eigenaar
        }
        return data
      },
    ],
  },
}
