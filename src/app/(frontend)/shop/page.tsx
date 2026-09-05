import Link from 'next/link'
import React from 'react'

import InzichtenZijbalk from '@/components/InzichtenZijbalk'
import MijnShopKaart from '@/components/MijnShopKaart'
import { berekenShopInzichten } from '@/lib/shopInzichten'
import { getPayloadClient, getViewer } from '@/lib/viewer'

export default async function MijnShopPage() {
  const viewer = await getViewer()

  if (!viewer) {
    return (
      <div className="pagina">
        <div className="niet-ingelogd-melding">
          Kies hierboven een testgebruiker om je eigen Shop te bekijken.
        </div>
      </div>
    )
  }

  const payload = await getPayloadClient()

  const [itemsRes, itemViewsRes] = await Promise.all([
    payload.find({
      collection: 'shop-items',
      where: { eigenaar: { equals: viewer.id } },
      depth: 1,
      limit: 100,
      sort: '-createdAt',
    }),
    // `eigenaar` is gedenormaliseerd op item-views (zie ItemViews.ts), dus dit hoeft niet
    // via een item-ids-lijst te lopen.
    payload.find({
      collection: 'item-views',
      where: { eigenaar: { equals: viewer.id } },
      depth: 0,
      limit: 5000,
    }),
  ])

  const items = itemsRes.docs
  const inzichten = berekenShopInzichten(
    items,
    itemViewsRes.docs.map((v) => ({ item: v.item, createdAt: v.createdAt })),
  )

  const categorieIds = inzichten.categorieen.map((c) => c.id)
  const matchesRes =
    categorieIds.length > 0
      ? await payload.find({
          collection: 'users',
          where: {
            and: [{ interesses: { in: categorieIds } }, { id: { not_equals: viewer.id } }],
          },
          depth: 0,
          limit: 200,
        })
      : null
  const potentieleMatches = matchesRes?.totalDocs ?? 0

  return (
    <div className="pagina">
      <div className="mijn-shop__topbar">
        <h1>Mijn Shop</h1>
        <Link href="/shop/nieuw" className="swopla-btn swopla-btn--primair">
          + Item toevoegen
        </Link>
      </div>

      <div className="mijn-shop__layout">
        <div style={{ flex: 1, minWidth: 0 }}>
          {items.length === 0 ? (
            <div className="leeg-resultaat">
              Je shop is nog leeg. Voeg je eerste item toe om te kunnen ruilen.
            </div>
          ) : (
            <div className="product-grid">
              {items.map((item) => (
                <MijnShopKaart key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>

        <InzichtenZijbalk inzichten={inzichten} potentieleMatches={potentieleMatches} />
      </div>
    </div>
  )
}
