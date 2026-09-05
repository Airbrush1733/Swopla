import React from 'react'

import ProductCard from '@/components/ProductCard'
import { bouwCategorieMap, hoofdcategorieen } from '@/lib/categorieHelpers'
import { berekenOntdekkenScore } from '@/lib/matchscore'
import {
  filterItems,
  parseFilters,
  STAAT_LABELS,
  type OntdekkenFilters,
} from '@/lib/ontdekkenFilters'
import { getPayloadClient, getViewer } from '@/lib/viewer'
import { afstandKm } from '@/lib/geo'
import type { User } from '@/payload-types'

type ZoekParams = Record<string, string | string[] | undefined>

function bouwParams(filters: OntdekkenFilters): URLSearchParams {
  const params = new URLSearchParams()
  filters.categorie.forEach((c) => params.append('categorie', c))
  filters.staat.forEach((s) => params.append('staat', s))
  if (filters.overdracht) params.set('overdracht', filters.overdracht)
  if (filters.afstand) params.set('afstand', filters.afstand)
  if (filters.geverifieerd) params.set('geverifieerd', '1')
  if (filters.q) params.set('q', filters.q)
  if (filters.sort && filters.sort !== 'match') params.set('sort', filters.sort)
  return params
}

function hrefMet(filters: OntdekkenFilters): string {
  const qs = bouwParams(filters).toString()
  return qs ? `/?${qs}` : '/'
}

export default async function OntdekkenPage({
  searchParams,
}: {
  searchParams: Promise<ZoekParams>
}) {
  const sp = await searchParams
  const filters = parseFilters(sp)

  const payload = await getPayloadClient()
  const viewer = await getViewer()

  const [categorieenRes, matchConfig, itemsRes, viewerItemsRes, zoekgeschiedenisRes] =
    await Promise.all([
      payload.find({ collection: 'categories', limit: 200, depth: 0 }),
      payload.findGlobal({ slug: 'match-score-config' }),
      payload.find({
        collection: 'shop-items',
        where: viewer
          ? { and: [{ status: { equals: 'beschikbaar' } }, { eigenaar: { not_equals: viewer.id } }] }
          : { status: { equals: 'beschikbaar' } },
        depth: 1,
        limit: 100,
      }),
      viewer
        ? payload.find({
            collection: 'shop-items',
            where: { and: [{ eigenaar: { equals: viewer.id } }, { status: { equals: 'beschikbaar' } }] },
            depth: 0,
            limit: 100,
          })
        : Promise.resolve(null),
      viewer
        ? payload.find({
            collection: 'search-history',
            where: { gebruiker: { equals: viewer.id } },
            sort: '-createdAt',
            depth: 0,
            limit: 20,
          })
        : Promise.resolve(null),
    ])

  const categorieMap = bouwCategorieMap(categorieenRes.docs)
  const hoofdCategorieen = hoofdcategorieen(categorieenRes.docs)
  const viewerEigenItems = viewerItemsRes?.docs ?? []
  const zoektermen = zoekgeschiedenisRes?.docs.map((d) => d.zoekterm) ?? []

  const scoreMap = new Map<number, number>()
  for (const item of itemsRes.docs) {
    scoreMap.set(
      item.id,
      berekenOntdekkenScore({ item, viewer, viewerEigenItems, zoektermen, categorieMap, config: matchConfig }),
    )
  }

  const gefilterd = filterItems(itemsRes.docs, filters, categorieMap, viewer?.locatie_exact)

  const gesorteerd = [...gefilterd].sort((a, b) => {
    if (filters.sort === 'nieuw') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    if (filters.sort === 'afstand') {
      const eigenaarA = typeof a.eigenaar === 'object' ? (a.eigenaar as User) : null
      const eigenaarB = typeof b.eigenaar === 'object' ? (b.eigenaar as User) : null
      const kmA = afstandKm(viewer?.locatie_exact, eigenaarA?.locatie_exact) ?? Infinity
      const kmB = afstandKm(viewer?.locatie_exact, eigenaarB?.locatie_exact) ?? Infinity
      return kmA - kmB
    }
    return (scoreMap.get(b.id) ?? 0) - (scoreMap.get(a.id) ?? 0)
  })

  const hogeMatchDrempel = matchConfig.ontdekken_hoge_match_drempel ?? 75

  const chips: { label: string; href: string }[] = []
  filters.categorie.forEach((id) => {
    const naam = categorieMap.get(Number(id))?.naam ?? id
    chips.push({ label: naam, href: hrefMet({ ...filters, categorie: filters.categorie.filter((c) => c !== id) }) })
  })
  filters.staat.forEach((s) => {
    chips.push({
      label: STAAT_LABELS[s] ?? s,
      href: hrefMet({ ...filters, staat: filters.staat.filter((x) => x !== s) }),
    })
  })
  if (filters.overdracht) {
    chips.push({
      label: filters.overdracht === 'ophalen' ? 'Ophalen' : 'Verzenden',
      href: hrefMet({ ...filters, overdracht: null }),
    })
  }
  if (filters.afstand) {
    chips.push({ label: `< ${filters.afstand} km`, href: hrefMet({ ...filters, afstand: null }) })
  }
  if (filters.geverifieerd) {
    chips.push({ label: 'Alleen geverifieerd', href: hrefMet({ ...filters, geverifieerd: false }) })
  }
  if (filters.q) {
    chips.push({ label: `"${filters.q}"`, href: hrefMet({ ...filters, q: '' }) })
  }

  return (
    <div className="pagina">
      <form method="get" action="/">
        <div className="ontdekken__topbar">
          <div className="zoekbalk">
            <span aria-hidden="true">🔍</span>
            <input type="text" name="q" placeholder="bv. vintage camera" defaultValue={filters.q} />
          </div>
          <div className="sorteer-select">
            Sorteren op:
            <select name="sort" defaultValue={filters.sort}>
              <option value="match">Beste match</option>
              <option value="afstand">Afstand</option>
              <option value="nieuw">Nieuwste eerst</option>
            </select>
          </div>
        </div>

        <div className="ontdekken__layout">
          <aside className="filters">
            <div className="filters__titel">🔧 Filters</div>

            <div className="filtergroep">
              <div className="filtergroep__label">Categorie</div>
              {hoofdCategorieen.map((c) => (
                <label key={c.id} className="optie">
                  <input
                    type="checkbox"
                    name="categorie"
                    value={c.id}
                    defaultChecked={filters.categorie.includes(String(c.id))}
                  />
                  {c.naam}
                </label>
              ))}
            </div>

            <div className="filtergroep">
              <div className="filtergroep__label">Afstand</div>
              {[
                { waarde: '5', label: '< 5 km' },
                { waarde: '15', label: '< 15 km' },
                { waarde: '50', label: '< 50 km' },
                { waarde: '', label: 'Heel Nederland' },
              ].map((optie) => (
                <label key={optie.waarde || 'alle'} className="optie">
                  <input
                    type="radio"
                    name="afstand"
                    value={optie.waarde}
                    defaultChecked={(filters.afstand ?? '') === optie.waarde}
                  />
                  {optie.label}
                </label>
              ))}
            </div>

            <div className="filtergroep">
              <div className="filtergroep__label">Ophalen of verzenden</div>
              <div className="overdracht-toggle">
                {[
                  { waarde: '', label: 'Beide' },
                  { waarde: 'ophalen', label: 'Ophalen' },
                  { waarde: 'verzenden', label: 'Verzenden' },
                ].map((optie) => (
                  <label key={optie.waarde || 'beide'}>
                    <input
                      type="radio"
                      name="overdracht"
                      value={optie.waarde}
                      defaultChecked={(filters.overdracht ?? '') === optie.waarde}
                    />
                    <span>{optie.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="filtergroep">
              <div className="filtergroep__label">Staat</div>
              {Object.entries(STAAT_LABELS).map(([waarde, label]) => (
                <label key={waarde} className="optie">
                  <input
                    type="checkbox"
                    name="staat"
                    value={waarde}
                    defaultChecked={filters.staat.includes(waarde)}
                  />
                  {label}
                </label>
              ))}
            </div>

            <div className="filtergroep" style={{ borderBottom: 'none' }}>
              <label className="optie">
                <input type="checkbox" name="geverifieerd" value="1" defaultChecked={filters.geverifieerd} />
                Alleen geverifieerde gebruikers
              </label>
            </div>

            <button type="submit" className="swopla-btn swopla-btn--primair filters__toepassen">
              Filters toepassen
            </button>
          </aside>

          <div style={{ flex: 1, minWidth: 0 }}>
            {chips.length > 0 && (
              <div className="actieve-filters">
                {chips.map((chip) => (
                  <a key={chip.label} href={chip.href} className="filter-chip">
                    {chip.label} ×
                  </a>
                ))}
                <a href="/" className="filters-wissen">
                  Filters wissen
                </a>
              </div>
            )}

            <div className="resultaten-count">{gesorteerd.length} resultaten</div>

            {gesorteerd.length === 0 ? (
              <div className="leeg-resultaat">Geen resultaten met deze filters.</div>
            ) : (
              <div className="product-grid">
                {gesorteerd.map((item) => (
                  <ProductCard
                    key={item.id}
                    item={item}
                    score={scoreMap.get(item.id) ?? 0}
                    hogeMatchDrempel={hogeMatchDrempel}
                    bezoekerLocatie={viewer?.locatie_exact}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}
