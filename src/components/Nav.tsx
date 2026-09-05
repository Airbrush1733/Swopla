import Link from 'next/link'
import React from 'react'

import { zetTestgebruiker } from '@/app/(frontend)/viewer-actions'
import { initialenVan } from '@/lib/format'
import { getTestGebruikers, getViewer } from '@/lib/viewer'

function Logo() {
  return (
    <Link href="/" className="nav__logo">
      Sw
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4 9c2-4 6-6 10-4"
          stroke="oklch(42% 0.13 150)"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          d="M20 15c-2 4-6 6-10 4"
          stroke="oklch(70% 0.15 95)"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </svg>
      pla
    </Link>
  )
}

export default async function Nav() {
  const [viewer, testGebruikers] = await Promise.all([getViewer(), getTestGebruikers()])

  return (
    <header className="nav">
      <div className="nav__inner">
        <Logo />
        <nav className="nav__rechts">
          <span className="nav__link" style={{ color: 'var(--swopla-grijs-licht)' }}>
            Veiligheid &amp; hulp
          </span>

          {viewer && (
            <div className="nav__avatar" title={viewer.naam ?? viewer.email}>
              {initialenVan(viewer.naam, viewer.email)}
            </div>
          )}

          <form action={zetTestgebruiker} className="nav__viewer-form">
            <select name="viewerId" defaultValue={viewer ? String(viewer.id) : ''}>
              <option value="">— Uitgelogd —</option>
              {testGebruikers.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.naam ?? g.email}
                </option>
              ))}
            </select>
            <button type="submit" title="Tijdelijke vervanging voor echte login">
              Bekijk als
            </button>
          </form>
        </nav>
      </div>
    </header>
  )
}
