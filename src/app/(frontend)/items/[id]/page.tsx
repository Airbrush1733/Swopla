import Link from 'next/link'
import { notFound } from 'next/navigation'
import React from 'react'

import { initialenVan } from '@/lib/format'
import { bouwCategorieMap } from '@/lib/categorieHelpers'
import { berekenMariekeMatch, berekenProductmatch, matchBand } from '@/lib/matchscore'
import { STAAT_LABELS, WAARDE_LABELS } from '@/lib/ontdekkenFilters'
import { getPayloadClient, getViewer } from '@/lib/viewer'
import type { Media, ShopItem, User } from '@/payload-types'

function overdrachtLabel(overdracht: ShopItem['overdracht']): string {
  if (overdracht.includes('ophalen') && overdracht.includes('verzenden'))
    return 'Ophalen of verzenden'
  if (overdracht.includes('ophalen')) return 'Ophalen'
  return 'Verzenden'
}

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idParam } = await params
  const id = Number(idParam)
  if (!Number.isFinite(id)) notFound()

  const payload = await getPayloadClient()
  const viewer = await getViewer()

  let item: ShopItem
  try {
    item = await payload.findByID({ collection: 'shop-items', id, depth: 1 })
  } catch {
    notFound()
  }

  const eigenaar = typeof item.eigenaar === 'object' ? (item.eigenaar as User) : null
  const isEigenItem = viewer !== null && eigenaar !== null && viewer.id === eigenaar.id

  // Elke weergave van een niet-eigen item wordt gelogd (zie ItemViews.ts) -- behalve
  // wanneer je je eigen item bekijkt, anders blaast eigen bezoek de eigen telling op.
  // Best-effort: een mislukte log mag de paginaweergave nooit blokkeren.
  const moetLoggen = !isEigenItem

  const [categorieenRes, matchConfig, aanbiederItemsRes, viewerItemsRes, , weergavenTellingRes] =
    await Promise.all([
      payload.find({ collection: 'categories', limit: 200, depth: 0 }),
      payload.findGlobal({ slug: 'match-score-config' }),
      eigenaar
        ? payload.find({
            collection: 'shop-items',
            where: {
              and: [
                { eigenaar: { equals: eigenaar.id } },
                { status: { equals: 'beschikbaar' } },
                { id: { not_equals: item.id } },
              ],
            },
            depth: 1,
            limit: 50,
          })
        : Promise.resolve(null),
      viewer && !isEigenItem
        ? payload.find({
            collection: 'shop-items',
            where: {
              and: [{ eigenaar: { equals: viewer.id } }, { status: { equals: 'beschikbaar' } }],
            },
            depth: 1,
            limit: 50,
          })
        : Promise.resolve(null),
      moetLoggen
        ? payload
            .create({
              collection: 'item-views',
              data: { item: item.id, ...(viewer ? { kijker: viewer.id } : {}) },
            })
            .catch(() => null)
        : Promise.resolve(null),
      payload
        .count({ collection: 'item-views', where: { item: { equals: item.id } } })
        .catch(() => null),
    ])

  const weergavenTotaal = (weergavenTellingRes?.totalDocs ?? 0) + (moetLoggen ? 1 : 0)

  const categorieMap = bouwCategorieMap(categorieenRes.docs)
  const aanbiederItems = aanbiederItemsRes?.docs ?? []
  const viewerEigenItems = viewerItemsRes?.docs ?? []

  const mariekeMatch =
    viewer && eigenaar && !isEigenItem
      ? berekenMariekeMatch({
          bezoeker: viewer,
          bezoekerItems: viewerEigenItems,
          aanbieder: eigenaar,
          aanbiederItems: [...aanbiederItems, item],
          categorieMap,
          config: matchConfig,
        })
      : null

  const ruilkansen = viewerEigenItems
    .map((kandidaat) => ({
      kandidaat,
      score: berekenProductmatch({
        bekekenItem: item,
        kandidaat,
        categorieMap,
        config: matchConfig,
      }),
    }))
    .sort((a, b) => b.score - a.score)

  const besteRuilkans = ruilkansen[0]

  const hogeMatchDrempel = matchConfig.ontdekken_hoge_match_drempel ?? 75

  const fotos = item.fotos.filter((f): f is Media => typeof f === 'object')
  const categorieNaam = typeof item.categorie === 'object' ? item.categorie.naam : ''

  return (
    <div className="pagina">
      <Link href="/" className="terug-link">
        ← Terug naar zoekresultaten
      </Link>

      <div className="detail__kaart">
        <div className="detail">
          <div className="detail__media">
            <div className="detail__hoofdfoto">
              {fotos[0]?.url && <img src={fotos[0].url} alt={fotos[0].alt} />}
            </div>
            {fotos.length > 1 && (
              <div className="detail__thumbs">
                {fotos.slice(1, 5).map((foto) => (
                  <div key={foto.id} className="detail__thumb">
                    <img src={foto.url ?? ''} alt={foto.alt} />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="detail__info">
            <div className="detail__titelrij">
              <h1>{item.titel}</h1>
              <div style={{ display: 'flex', gap: 8 }}>
                <span
                  className="swopla-btn swopla-btn--outline"
                  style={{ padding: '8px 10px', opacity: 0.6, cursor: 'default' }}
                  title="Bewaren is nog niet gebouwd (nieuw begrip, nog geen datamodel voor)"
                  aria-hidden="true"
                >
                  ♡
                </span>
                <span
                  className="swopla-btn swopla-btn--outline"
                  style={{ padding: '8px 10px', opacity: 0.6, cursor: 'default' }}
                  title="Delen is nog niet gebouwd"
                  aria-hidden="true"
                >
                  ⤴
                </span>
              </div>
            </div>

            <div className="detail__meta">
              {eigenaar?.locatie_ruw && <span>📍 {eigenaar.locatie_ruw}</span>}
              <span>🏷️ {categorieNaam}</span>
              <span>👁️ {weergavenTotaal} keer bekeken</span>
            </div>

            <div className="detail__infostrip">
              <div>
                <div className="label">Staat</div>
                <div className="waarde">{STAAT_LABELS[item.staat] ?? item.staat}</div>
              </div>
              <div>
                <div className="label">Waarde</div>
                <div className="waarde">
                  {WAARDE_LABELS[item.waarde_indicatie] ?? item.waarde_indicatie}
                </div>
              </div>
              <div>
                <div className="label">Overdracht</div>
                <div className="waarde">{overdrachtLabel(item.overdracht)}</div>
              </div>
            </div>

            <p className="detail__beschrijving">{item.beschrijving}</p>

            {besteRuilkans && besteRuilkans.score > 0 && (
              <div className="ai-tip">
                <div className="ai-tip__badge" aria-hidden="true" />
                <div>
                  AI-tip: &quot;{besteRuilkans.kandidaat.titel}&quot; uit jouw shop is de beste
                  match hieronder bij Ruilkansen. Voeg toe en verhoog je ruilkans.
                </div>
              </div>
            )}

            {isEigenItem ? (
              <div className="niet-ingelogd-melding">Dit is een van je eigen items.</div>
            ) : viewer ? (
              <button
                type="button"
                className="swopla-btn swopla-btn--primair"
                style={{ width: '100%' }}
                title="Ruilvoorstel-overlay is nog niet gebouwd (buiten scope van deze eerste versie)"
              >
                Stel een ruil voor
              </button>
            ) : (
              <div className="niet-ingelogd-melding">
                Kies hierboven een testgebruiker om te zien hoe dit item bij jouw shop past.
              </div>
            )}
          </div>
        </div>
      </div>

      {eigenaar && (
        <div className="aanbieder-kaart">
          <div className="aanbieder-kaart__rij">
            <div className="aanbieder-kaart__avatar">
              {initialenVan(eigenaar.naam, eigenaar.email)}
            </div>
            <div>
              <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                {eigenaar.naam ?? eigenaar.email}
                {eigenaar.geverifieerd_email && eigenaar.geverifieerd_telefoon && (
                  <span className="geverifieerd-badge">✓ Geverifieerd</span>
                )}
              </div>
              <div style={{ fontSize: 13, color: 'var(--swopla-grijs-licht)' }}>
                {eigenaar.voltooide_ruilen ?? 0} ruilen voltooid
              </div>
            </div>
          </div>
          <span
            className="swopla-btn swopla-btn--outline"
            style={{ alignSelf: 'flex-start', opacity: 0.6, cursor: 'default' }}
            title="Publieke shop-pagina is nog niet gebouwd (buiten scope van deze eerste versie)"
          >
            Bekijk shop van {eigenaar.naam ?? eigenaar.email} ({aanbiederItems.length + 1} items)
          </span>
        </div>
      )}

      {!isEigenItem && (
        <div className="ruilkansen">
          <div className="ruilkansen__header">
            <h2>🔁 Ruilkansen</h2>
            {mariekeMatch !== null && eigenaar && (
              <span
                className={`marieke-pill marieke-pill--${matchBand(mariekeMatch, hogeMatchDrempel)}`}
              >
                {mariekeMatch}% match met {eigenaar.naam ?? eigenaar.email}
              </span>
            )}
          </div>
          <p style={{ fontSize: 13, color: 'var(--swopla-grijs)' }}>
            Dit zijn items uit jouw eigen shop die goed passen bij dit item en de shop van{' '}
            {eigenaar?.naam ?? 'de aanbieder'}.
          </p>

          {!viewer && (
            <div className="niet-ingelogd-melding">
              Kies hierboven een testgebruiker om je eigen Ruilkansen te zien.
            </div>
          )}

          {viewer && ruilkansen.length === 0 && (
            <div className="niet-ingelogd-melding">
              Je hebt nog geen items in je shop om aan te bieden.
            </div>
          )}

          {ruilkansen.length > 0 && (
            <div className="ruilkansen__items">
              {ruilkansen.map(({ kandidaat, score }) => {
                const foto = kandidaat.fotos.find((f): f is Media => typeof f === 'object')
                return (
                  <Link
                    key={kandidaat.id}
                    href={`/items/${kandidaat.id}`}
                    className="ruilkans-chip"
                  >
                    {foto?.url && <img src={foto.url} alt={foto.alt} />}
                    {kandidaat.titel}
                    <span
                      className={`ruilkans-chip__pct ruilkans-chip__pct--${matchBand(score, hogeMatchDrempel)}`}
                    >
                      {score}%
                    </span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
