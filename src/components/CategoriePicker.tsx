'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'

import type { Category } from '@/payload-types'

export interface CategoriePickerProps {
  alleCategorieen: Category[]
  name: string
  placeholder?: string
  standaardCategorie?: Category | null
}

interface ZwevendePositie {
  left: number
  width: number
  maxHeight: number
  boven: boolean
  top?: number
  bottom?: number
}

const MAX_SUGGESTIES = 8
const GEWENSTE_HOOGTE = 320
const MIN_HOOGTE = 140

/**
 * Berekent waar de suggestielijst moet zweven t.o.v. de viewport (niet t.o.v. de pagina) --
 * nodig omdat dit veld ook onderaan een lang formulier kan staan: een gewone "onder het veld"-
 * dropdown zou dan deels of helemaal buiten beeld vallen en de gebruiker moet de pagina zelf
 * naar beneden scrollen om een optie te kunnen kiezen. Kiest zelf boven of onder het veld,
 * afhankelijk van waar meer ruimte is, en past zijn eigen (interne) scrollhoogte aan de
 * beschikbare ruimte aan zodat de lijst altijd volledig in beeld past.
 */
function berekenZwevendePositie(rect: DOMRect): ZwevendePositie {
  const ruimteOnder = window.innerHeight - rect.bottom
  const ruimteBoven = rect.top

  if (ruimteOnder >= MIN_HOOGTE || ruimteOnder >= ruimteBoven) {
    return {
      boven: false,
      top: rect.bottom + 6,
      left: rect.left,
      width: rect.width,
      maxHeight: Math.max(MIN_HOOGTE, Math.min(GEWENSTE_HOOGTE, ruimteOnder - 12)),
    }
  }

  return {
    boven: true,
    bottom: window.innerHeight - rect.top + 6,
    left: rect.left,
    width: rect.width,
    maxHeight: Math.max(MIN_HOOGTE, Math.min(GEWENSTE_HOOGTE, ruimteBoven - 12)),
  }
}

/**
 * Categorie-picker (single-select, voor een hasMany:false relationship-veld) die er in rust
 * uitziet als een gewone dropdown (doos + chevron, zoals de mockup) maar bij een klik
 * verandert in een zoekveld -- typen filtert, alleen klikken of Enter op een suggestie kiest
 * een waarde. Een gekozen subcategorie toont als "Hoofdcategorie → Subcategorie".
 *
 * Gebruikt voor zowel het verplichte "Categorie"-veld als (via GewenstTerugVeld) het
 * optionele "Wat wil je hiervoor het liefst terug?"-veld.
 */
export default function CategoriePicker({
  alleCategorieen,
  name,
  placeholder = 'Kies een categorie…',
  standaardCategorie = null,
}: CategoriePickerProps) {
  const [bewerken, setBewerken] = useState(false)
  const [zoekterm, setZoekterm] = useState('')
  const [gemarkeerdIndex, setGemarkeerdIndex] = useState(0)
  const [gekozen, setGekozen] = useState<Category | null>(standaardCategorie)
  const [positie, setPositie] = useState<ZwevendePositie | null>(null)
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    function opDocumentClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setBewerken(false)
        setZoekterm('')
      }
    }
    document.addEventListener('mousedown', opDocumentClick)
    return () => document.removeEventListener('mousedown', opDocumentClick)
  }, [])

  // Sluit de zwevende lijst bij scrollen/resizen i.p.v. de positie continu te herberekenen --
  // een gebruiker die tijdens het kiezen gaat scrollen is een randgeval, dit voorkomt een
  // lijst die niet meer bij het veld aansluit.
  useEffect(() => {
    if (!bewerken) return
    function opWeg() {
      setBewerken(false)
    }
    window.addEventListener('scroll', opWeg, true)
    window.addEventListener('resize', opWeg)
    return () => {
      window.removeEventListener('scroll', opWeg, true)
      window.removeEventListener('resize', opWeg)
    }
  }, [bewerken])

  const categorieMap = useMemo(
    () => new Map(alleCategorieen.map((c) => [c.id, c])),
    [alleCategorieen],
  )

  function parentVan(c: Category): Category | null {
    const parentId = typeof c.parent === 'object' ? (c.parent?.id ?? null) : c.parent
    if (!parentId) return null
    return categorieMap.get(parentId) ?? null
  }

  function weergaveNaam(c: Category): string {
    const parent = parentVan(c)
    return parent ? `${parent.naam} → ${c.naam}` : c.naam
  }

  const suggesties = useMemo(() => {
    const q = zoekterm.trim().toLowerCase()
    const bron =
      q.length === 0
        ? alleCategorieen
        : alleCategorieen.filter((c) => c.naam.toLowerCase().includes(q))
    return bron.slice(0, MAX_SUGGESTIES)
  }, [zoekterm, alleCategorieen])

  function kies(c: Category) {
    setGekozen(c)
    setZoekterm('')
    setBewerken(false)
  }

  function openBewerken(e: React.MouseEvent<HTMLButtonElement>) {
    setPositie(berekenZwevendePositie(e.currentTarget.getBoundingClientRect()))
    setBewerken(true)
    setZoekterm('')
    setGemarkeerdIndex(0)
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  function opToetsIn(e: React.KeyboardEvent<HTMLInputElement>) {
    if (suggesties.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setGemarkeerdIndex((i) => (i + 1) % suggesties.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setGemarkeerdIndex((i) => (i - 1 + suggesties.length) % suggesties.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      kies(suggesties[gemarkeerdIndex])
    } else if (e.key === 'Escape') {
      setBewerken(false)
      setZoekterm('')
    }
  }

  return (
    <div className="select-veld" ref={wrapperRef}>
      <input type="hidden" name={name} value={gekozen ? gekozen.id : ''} />

      {bewerken ? (
        <>
          <div className="select-veld__doos select-veld__doos--bewerken">
            <input
              ref={inputRef}
              type="text"
              placeholder="Typ om te zoeken…"
              value={zoekterm}
              onChange={(e) => {
                setZoekterm(e.target.value)
                setGemarkeerdIndex(0)
              }}
              onKeyDown={opToetsIn}
              role="combobox"
              aria-expanded={suggesties.length > 0}
              aria-autocomplete="list"
            />
          </div>
          {suggesties.length > 0 && positie && (
            <ul
              className="zoek-suggesties zoek-suggesties--zwevend"
              role="listbox"
              style={{
                left: positie.left,
                width: positie.width,
                maxHeight: positie.maxHeight,
                top: positie.boven ? undefined : positie.top,
                bottom: positie.boven ? positie.bottom : undefined,
              }}
            >
              {suggesties.map((c, i) => (
                <li key={c.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={i === gemarkeerdIndex}
                    className={i === gemarkeerdIndex ? 'is-gemarkeerd' : undefined}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setGemarkeerdIndex(i)}
                    onClick={() => kies(c)}
                  >
                    {weergaveNaam(c)}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <button type="button" className="select-veld__doos" onClick={openBewerken}>
          <span className={gekozen ? undefined : 'select-veld__placeholder'}>
            {gekozen ? weergaveNaam(gekozen) : placeholder}
          </span>
          <span className="select-veld__chevron" aria-hidden="true">
            ⌄
          </span>
        </button>
      )}
    </div>
  )
}
