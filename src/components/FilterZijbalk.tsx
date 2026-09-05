'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import React, { useEffect, useState } from 'react'

import { STAAT_LABELS, type FacetTellingen } from '@/lib/ontdekkenFilters'

export interface FilterZijbalkProps {
  hoofdCategorieen: { id: number; naam: string }[]
  tellingen: FacetTellingen
  aantalResultaten: number
}

const AFSTAND_OPTIES = [
  { waarde: '5', label: '< 5 km' },
  { waarde: '15', label: '< 15 km' },
  { waarde: '50', label: '< 50 km' },
  { waarde: '', label: 'Heel Nederland' },
]

const OVERDRACHT_OPTIES = [
  { waarde: '', label: 'Beide' },
  { waarde: 'ophalen', label: 'Ophalen' },
  { waarde: 'verzenden', label: 'Verzenden' },
]

const FILTER_GROEP_NAMEN = ['categorie', 'afstand', 'overdracht', 'staat', 'geverifieerd'] as const
type FilterGroepNaam = (typeof FILTER_GROEP_NAMEN)[number]

function FilterIcoon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M2 4h12M4.5 8h7M6.5 12h3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle
        cx="5"
        cy="4"
        r="1.4"
        fill="currentColor"
        stroke="var(--swopla-achtergrond, #fff)"
        strokeWidth="0.6"
      />
      <circle
        cx="10.5"
        cy="8"
        r="1.4"
        fill="currentColor"
        stroke="var(--swopla-achtergrond, #fff)"
        strokeWidth="0.6"
      />
      <circle
        cx="8"
        cy="12"
        r="1.4"
        fill="currentColor"
        stroke="var(--swopla-achtergrond, #fff)"
        strokeWidth="0.6"
      />
    </svg>
  )
}

/**
 * Filter-zijbalk voor Ontdekken, past instant toe bij elke wijziging (geen aparte
 * "toepassen"-knop, zie Ralphs feedback op de eerste versie). Elke handler duwt de
 * bijgewerkte queryparams naar de URL; Next.js rendert de resultatenlijst (Server
 * Component, leest `searchParams`) daarna automatisch opnieuw zonder volledige reload.
 *
 * Op tablet-portrait en kleiner (<=900px, zie styles.css) wordt de vaste zijbalk verborgen
 * en verschijnt in plaats daarvan een "Filters"-knop die een paneel opent dat van rechts
 * inschuift (zelfde herkenbare beweging als een chatwidget) met een donkere overlay op de
 * rest. De filtergroepen zijn daarbinnen inklapbaar (accordion). Filters werken ook daar
 * instant -- de knop onderaan toont het live resultaataantal en sluit het paneel, "Wis
 * alle filters" verwijdert alle filter-queryparams in een keer.
 */
export default function FilterZijbalk({
  hoofdCategorieen,
  tellingen,
  aantalResultaten,
}: FilterZijbalkProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [paneelOpen, setPaneelOpen] = useState(false)
  const [opengeklapt, setOpengeklapt] = useState<Set<FilterGroepNaam>>(new Set())

  // Body-scroll blokkeren zolang het mobiele filterpaneel open staat.
  useEffect(() => {
    if (!paneelOpen) return
    const vorige = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = vorige
    }
  }, [paneelOpen])

  // Esc sluit het paneel.
  useEffect(() => {
    if (!paneelOpen) return
    function opToets(e: KeyboardEvent) {
      if (e.key === 'Escape') setPaneelOpen(false)
    }
    document.addEventListener('keydown', opToets)
    return () => document.removeEventListener('keydown', opToets)
  }, [paneelOpen])

  function duwParams(muteer: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString())
    muteer(params)
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  function toggleMeerdereWaarden(naam: string, waarde: string, aangevinkt: boolean) {
    duwParams((params) => {
      const overig = params.getAll(naam).filter((v) => v !== waarde)
      params.delete(naam)
      const nieuw = aangevinkt ? [...overig, waarde] : overig
      nieuw.forEach((v) => params.append(naam, v))
    })
  }

  function zetEnkeleWaarde(naam: string, waarde: string) {
    duwParams((params) => {
      if (waarde) params.set(naam, waarde)
      else params.delete(naam)
    })
  }

  function zetVinkje(naam: string, aangevinkt: boolean) {
    duwParams((params) => {
      if (aangevinkt) params.set(naam, '1')
      else params.delete(naam)
    })
  }

  function wisAlleFilters() {
    duwParams((params) => {
      params.delete('categorie')
      params.delete('staat')
      params.delete('overdracht')
      params.delete('afstand')
      params.delete('geverifieerd')
    })
  }

  function toggleGroep(naam: FilterGroepNaam) {
    setOpengeklapt((huidig) => {
      const nieuw = new Set(huidig)
      if (nieuw.has(naam)) nieuw.delete(naam)
      else nieuw.add(naam)
      return nieuw
    })
  }

  const huidigeCategorie = searchParams.getAll('categorie')
  const huidigeStaat = searchParams.getAll('staat')
  const huidigeAfstand = searchParams.get('afstand') ?? ''
  const huidigeOverdracht = searchParams.get('overdracht') ?? ''
  const huidigGeverifieerd = searchParams.get('geverifieerd') === '1'

  const aantalActieveFilters =
    huidigeCategorie.length +
    huidigeStaat.length +
    (huidigeAfstand ? 1 : 0) +
    (huidigeOverdracht ? 1 : 0) +
    (huidigGeverifieerd ? 1 : 0)

  /** Een filtergroep -- statisch op desktop, inklapbaar (accordion) in het mobiele paneel. */
  function Filtergroep({
    naam,
    titel,
    accordion,
    children,
  }: {
    naam: FilterGroepNaam
    titel: string
    accordion: boolean
    children: React.ReactNode
  }) {
    if (!accordion) {
      return (
        <div className="filtergroep">
          <div className="filtergroep__label">{titel}</div>
          {children}
        </div>
      )
    }
    const open = opengeklapt.has(naam)
    return (
      <div className={`filtergroep filtergroep--accordion${open ? ' is-open' : ''}`}>
        <button
          type="button"
          className="filtergroep__kop"
          onClick={() => toggleGroep(naam)}
          aria-expanded={open}
        >
          <span>{titel}</span>
          <span className="filtergroep__chevron" aria-hidden="true">
            ⌄
          </span>
        </button>
        {open && <div className="filtergroep__inhoud">{children}</div>}
      </div>
    )
  }

  function FilterInhoud({ accordion }: { accordion: boolean }) {
    return (
      <>
        <Filtergroep naam="categorie" titel="Categorie" accordion={accordion}>
          {hoofdCategorieen.map((c) => (
            <label key={c.id} className="optie">
              <input
                type="checkbox"
                checked={huidigeCategorie.includes(String(c.id))}
                onChange={(e) => toggleMeerdereWaarden('categorie', String(c.id), e.target.checked)}
              />
              {c.naam} <span className="optie__telling">({tellingen.categorie[c.id] ?? 0})</span>
            </label>
          ))}
        </Filtergroep>

        <Filtergroep naam="afstand" titel="Afstand" accordion={accordion}>
          {AFSTAND_OPTIES.map((optie) => (
            <label key={optie.waarde || 'alle'} className="optie">
              <input
                type="radio"
                name="afstand-ui"
                checked={huidigeAfstand === optie.waarde}
                onChange={() => zetEnkeleWaarde('afstand', optie.waarde)}
              />
              {optie.label}{' '}
              <span className="optie__telling">({tellingen.afstand[optie.waarde] ?? 0})</span>
            </label>
          ))}
        </Filtergroep>

        <Filtergroep naam="overdracht" titel="Ophalen of verzenden" accordion={accordion}>
          <div className="overdracht-toggle">
            {OVERDRACHT_OPTIES.map((optie) => {
              const telling =
                optie.waarde === 'ophalen'
                  ? tellingen.overdracht.ophalen
                  : optie.waarde === 'verzenden'
                    ? tellingen.overdracht.verzenden
                    : tellingen.overdracht.beide
              return (
                <label key={optie.waarde || 'beide'}>
                  <input
                    type="radio"
                    name="overdracht-ui"
                    checked={huidigeOverdracht === optie.waarde}
                    onChange={() => zetEnkeleWaarde('overdracht', optie.waarde)}
                  />
                  <span>
                    {optie.label} ({telling})
                  </span>
                </label>
              )
            })}
          </div>
        </Filtergroep>

        <Filtergroep naam="staat" titel="Staat" accordion={accordion}>
          {Object.entries(STAAT_LABELS).map(([waarde, label]) => (
            <label key={waarde} className="optie">
              <input
                type="checkbox"
                checked={huidigeStaat.includes(waarde)}
                onChange={(e) => toggleMeerdereWaarden('staat', waarde, e.target.checked)}
              />
              {label} <span className="optie__telling">({tellingen.staat[waarde] ?? 0})</span>
            </label>
          ))}
        </Filtergroep>

        <Filtergroep naam="geverifieerd" titel="Betrouwbaarheid" accordion={accordion}>
          <label className="optie">
            <input
              type="checkbox"
              checked={huidigGeverifieerd}
              onChange={(e) => zetVinkje('geverifieerd', e.target.checked)}
            />
            Alleen geverifieerde gebruikers{' '}
            <span className="optie__telling">({tellingen.geverifieerd})</span>
          </label>
        </Filtergroep>
      </>
    )
  }

  return (
    <>
      {/* Desktop / breder dan 900px */}
      <aside className="filters">
        <div className="filters__titel">🔧 Filters</div>
        <FilterInhoud accordion={false} />
      </aside>

      {/* Mobiel / tablet-portrait: knop + inschuivend paneel */}
      <button type="button" className="filter-mobiel-knop" onClick={() => setPaneelOpen(true)}>
        <FilterIcoon />
        Filters
        {aantalActieveFilters > 0 && (
          <span className="filter-mobiel-knop__badge">{aantalActieveFilters}</span>
        )}
      </button>

      <div
        className={`filter-drawer-overlay${paneelOpen ? ' is-open' : ''}`}
        onClick={() => setPaneelOpen(false)}
        aria-hidden={!paneelOpen}
      />

      <div
        className={`filter-drawer${paneelOpen ? ' is-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Filters"
      >
        <div className="filter-drawer__header">
          <span>Filters</span>
          <button
            type="button"
            className="filter-drawer__sluit"
            onClick={() => setPaneelOpen(false)}
            aria-label="Filters sluiten"
          >
            ×
          </button>
        </div>

        <div className="filter-drawer__inhoud">
          <FilterInhoud accordion={true} />
        </div>

        <div className="filter-drawer__onderbalk">
          {aantalActieveFilters > 0 && (
            <button type="button" className="filter-drawer__wis" onClick={wisAlleFilters}>
              Wis alle filters
            </button>
          )}
          <button
            type="button"
            className="filter-drawer__toon"
            onClick={() => setPaneelOpen(false)}
          >
            Toon {aantalResultaten} {aantalResultaten === 1 ? 'product' : 'producten'}
          </button>
        </div>
      </div>
    </>
  )
}
