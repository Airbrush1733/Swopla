import Link from 'next/link'
import React, { Suspense } from 'react'

import FilterZijbalk from '@/components/FilterZijbalk'
import ProductCard from '@/components/ProductCard'
import ZoekEnSorteer from '@/components/ZoekEnSorteer'
import { bouwCategorieMap, categorieIdVan, hoofdcategorieen } from '@/lib/categorieHelpers'
import { berekenOntdekkenScore } from '@/lib/matchscore'
import {
  berekenFacetTellingen,
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

  // viewer + categorieën/matchConfig/shop-items lopen parallel: de shop-items-query zelf
  // hoeft niet op de viewer te wachten (de eigen items van de viewer worden er hieronder
  // gewoon uitgefilterd), dus alle vier kunnen in dezelfde ronde naar Neon.
  const [viewer, categorieenRes, matchConfig, itemsResRuw] = await Promise.all([
    getViewer(),
    payload.find({ collection: 'categories', limit: 200, depth: 0 }),
    payload.findGlobal({ slug: 'match-score-config' }),
    payload.find({
      collection: 'shop-items',
      where: { status: { equals: 'beschikbaar' } },
      depth: 1,
      limit: 100,
    }),
  ])

  // Deze twee hebben de viewer wél nodig om hun eigen where-clause te bouwen, dus die
  // kunnen pas in een tweede (nog steeds onderling parallelle) ronde.
  const [viewerItemsRes, zoekgeschiedenisRes] = await Promise.all([
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

  // Eigen items van de viewer horen niet tussen "te ontdekken" items — voorheen deed de
  // query dit met een `not_equals`-voorwaarde, nu gebeurt het hier zodat de query zelf
  // niet meer op de viewer hoeft te wachten (zie hierboven).
  const itemsDocs = viewer
    ? itemsResRuw.docs.filter((item) => {
        const eigenaarId = typeof item.eigenaar === 'object' ? item.eigenaar.id : item.eigenaar
        return eigenaarId !== viewer.id
      })
    : itemsResRuw.docs

  const scoreMap = new Map<number, number>()
  for (const item of itemsDocs) {
    scoreMap.set(
      item.id,
      berekenOntdekkenScore({ item, viewer, viewerEigenItems, zoektermen, categorieMap, config: matchConfig }),
    )
  }

  const gefilterd = filterItems(itemsDocs, filters, categorieMap, viewer?.locatie_exact)

  // Tellingen voor ALLE categorieën (hoofd- én subniveau) — nodig voor zowel de
  // zijbalk (hoofdcategorieën) als de zoeksuggesties (kunnen ook subcategorieën zijn).
  const facetTellingen = berekenFacetTellingen(
    itemsDocs,
    filters,
    categorieMap,
    viewer?.locatie_exact,
    categorieenRes.docs.map((c) => c.id),
  )

  const categorieSuggesties = categorieenRes.docs
    .map((c) => {
      const parentId = categorieIdVan(c.parent)
      return {
        id: c.id,
        naam: c.naam,
        parentNaam: parentId !== null ? (categorieMap.get(parentId)?.naam ?? null) : null,
        aantal: facetTellingen.categorie[c.id] ?? 0,
      }
    })
    .sort((a, b) => a.naam.localeCompare(b.naam, 'nl'))

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
      <Suspense fallback={<div className="ontdekken__topbar" />}>
        <ZoekEnSorteer categorieSuggesties={categorieSuggesties} />
      </Suspense>

      <div className="ontdekken__layout">
        <Suspense fallback={<aside className="filters" />}>
          <FilterZijbalk
            hoofdCategorieen={hoofdCategorieen}
            tellingen={facetTellingen}
            aantalResultaten={gesorteerd.length}
          />
        </Suspense>

        <div style={{ flex: 1, minWidth: 0 }}>
          {chips.length > 0 && (
            <div className="actieve-filters">
              {chips.map((chip) => (
                <Link key={chip.label} href={chip.href} className="filter-chip">
                  {chip.label} ×
                </Link>
              ))}
              <Link href="/" className="filters-wissen">
                Filters wissen
              </Link>
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
    </div>
  )
}
