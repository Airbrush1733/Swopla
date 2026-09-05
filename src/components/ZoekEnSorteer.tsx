'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import React, { useEffect, useMemo, useRef, useState } from 'react'

export interface CategorieSuggestie {
  id: number
  naam: string
  parentNaam: string | null
  aantal: number
}

export interface ZoekEnSorteerProps {
  categorieSuggesties: CategorieSuggestie[]
}

const MIN_LETTERS_VOOR_SUGGESTIES = 3
const MAX_SUGGESTIES = 8

/**
 * Zoekbalk + sorteer-dropdown voor Ontdekken. Werkt instant (geen "toepassen"-knop
 * nodig): filterwijzigingen duwen de nieuwe queryparams naar de URL, Next.js haalt
 * daarna alleen de bijgewerkte Server Component-data op (geen volledige page-reload).
 *
 * Vanaf 3 letters verschijnt een suggestie-dropdown met matchende categorieën (hoofd- én
 * subcategorieën), hetzelfde "typ-en-klik"-selectiemechanisme als elders in het concept
 * (Interesses, gewenst-terug), nu toegepast op de zoekbalk zelf. Alleen het klikken (of
 * met Enter bevestigen) van een suggestie zet een filter (categorie-queryparam, zelfde
 * als de zijbalk-checkboxes); los typen zonder een suggestie te kiezen past nooit een
 * filter toe. Er is dus geen los tekst-op-titel/omschrijving-zoeken.
 */
export default function ZoekEnSorteer({ categorieSuggesties }: ZoekEnSorteerProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [zoekterm, setZoekterm] = useState('')
  const [toonSuggesties, setToonSuggesties] = useState(false)
  const [gemarkeerdIndex, setGemarkeerdIndex] = useState(0)
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  // Klik buiten de zoekbalk sluit de suggestie-dropdown.
  useEffect(() => {
    function opDocumentClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setToonSuggesties(false)
      }
    }
    document.addEventListener('mousedown', opDocumentClick)
    return () => document.removeEventListener('mousedown', opDocumentClick)
  }, [])

  const suggesties = useMemo(() => {
    const q = zoekterm.trim().toLowerCase()
    if (q.length < MIN_LETTERS_VOOR_SUGGESTIES) return []
    return categorieSuggesties
      .filter((c) => c.naam.toLowerCase().includes(q) && c.aantal > 0)
      .slice(0, MAX_SUGGESTIES)
  }, [zoekterm, categorieSuggesties])

  function duwParams(muteer: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString())
    muteer(params)
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  function opZoektermChange(waarde: string) {
    setZoekterm(waarde)
    setGemarkeerdIndex(0)
    setToonSuggesties(waarde.trim().length >= MIN_LETTERS_VOOR_SUGGESTIES)
  }

  function kiesCategorieSuggestie(categorieId: number) {
    setZoekterm('')
    setToonSuggesties(false)
    duwParams((params) => {
      const bestaand = params.getAll('categorie')
      if (!bestaand.includes(String(categorieId))) {
        params.append('categorie', String(categorieId))
      }
    })
  }

  function wisZoekterm() {
    setZoekterm('')
    setToonSuggesties(false)
  }

  function opToetsIn(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!toonSuggesties || suggesties.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setGemarkeerdIndex((i) => (i + 1) % suggesties.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setGemarkeerdIndex((i) => (i - 1 + suggesties.length) % suggesties.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      kiesCategorieSuggestie(suggesties[gemarkeerdIndex].id)
    } else if (e.key === 'Escape') {
      setToonSuggesties(false)
    }
  }

  function opSortChange(waarde: string) {
    duwParams((params) => {
      if (waarde && waarde !== 'match') params.set('sort', waarde)
      else params.delete('sort')
    })
  }

  return (
    <div className="ontdekken__topbar">
      <div className="zoekbalk-wrapper" ref={wrapperRef}>
        <div className="zoekbalk">
          <span aria-hidden="true">🔍</span>
          <input
            type="text"
            placeholder="bv. vintage camera"
            value={zoekterm}
            onChange={(e) => opZoektermChange(e.target.value)}
            onFocus={() => setToonSuggesties(zoekterm.trim().length >= MIN_LETTERS_VOOR_SUGGESTIES)}
            onKeyDown={opToetsIn}
            role="combobox"
            aria-expanded={toonSuggesties && suggesties.length > 0}
            aria-autocomplete="list"
          />
          {zoekterm.length > 0 && (
            <button
              type="button"
              className="zoekbalk__wis"
              onClick={wisZoekterm}
              aria-label="Zoektekst wissen"
              title="Zoektekst wissen"
            >
              ×
            </button>
          )}
        </div>

        {toonSuggesties && suggesties.length > 0 && (
          <ul className="zoek-suggesties" role="listbox">
            {suggesties.map((c, i) => (
              <li key={c.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={i === gemarkeerdIndex}
                  className={i === gemarkeerdIndex ? 'is-gemarkeerd' : undefined}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setGemarkeerdIndex(i)}
                  onClick={() => kiesCategorieSuggestie(c.id)}
                  disabled={c.aantal === 0}
                >
                  <span className="zoek-suggesties__naam">
                    {c.naam} <span className="zoek-suggesties__aantal">({c.aantal})</span>
                    {c.parentNaam && (
                      <span className="zoek-suggesties__parent"> in {c.parentNaam}</span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="sorteer-select">
        Sorteren op:
        <select
          defaultValue={searchParams.get('sort') ?? 'match'}
          onChange={(e) => opSortChange(e.target.value)}
        >
          <option value="match">Beste match</option>
          <option value="afstand">Afstand</option>
          <option value="nieuw">Nieuwste eerst</option>
        </select>
      </div>
    </div>
  )
}
