'use client'

import Link from 'next/link'
import React, { useState } from 'react'

/**
 * Toont dezelfde "Stel een ruil voor"-knop als een ingelogde zoeker ziet (RuilvoorstelPaneel,
 * variant "zoeker-knop"), maar voor een gast (geen viewer, zie items/[id]/page.tsx). Iedereen
 * mag altijd vrij verkennen en zoeken, zie technische-architectuur-schets.md -> "Frontend:
 * Login & registratie", pas bij een poging om zelf te ruilen verschijnt de melding. Zelfde
 * donkere-overlay-met-gecentreerde-kaart-stijl als de foutmelding in RuilvoorstelPaneel.tsx,
 * bewust hergebruikt voor visuele consistentie tussen deze twee "eerst iets doen"-meldingen.
 */
export default function GastRuilKnop({ nextPad }: { nextPad: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        className="swopla-btn swopla-btn--primair"
        style={{ width: '100%' }}
        onClick={() => setOpen(true)}
      >
        Stel een ruil voor
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(20,20,20,0.55)',
            zIndex: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 28,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: 14,
              padding: '26px 28px',
              maxWidth: 340,
              textAlign: 'center',
              boxShadow: '0 16px 44px rgba(0,0,0,0.28)',
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.5 }}>
              Log in of maak een gratis account aan om een ruil voor te stellen.
            </div>
            <div
              style={{
                marginTop: 18,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <Link
                href="/registreren"
                className="swopla-btn swopla-btn--primair"
                style={{ width: '100%' }}
              >
                Account aanmaken
              </Link>
              <Link
                href={`/inloggen?next=${encodeURIComponent(nextPad)}`}
                style={{ fontSize: 13.5 }}
              >
                Ik heb al een account, inloggen
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
