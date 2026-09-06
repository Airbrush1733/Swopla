import Link from 'next/link'
import React from 'react'

import RegistrerenForm from './RegistrerenForm'

export default function RegistrerenPage() {
  return (
    <div className="pagina pagina--smal">
      <h1>Account aanmaken</h1>
      <p className="pagina__intro">
        Verkennen en zoeken kan altijd zonder account. Alleen om zelf een ruil voor te stellen heb
        je een geverifieerd account nodig.
      </p>

      <RegistrerenForm />

      <p style={{ fontSize: 13.5, color: 'var(--swopla-grijs)', marginTop: 20 }}>
        Heb je al een account? <Link href="/inloggen">Log in</Link>.
      </p>
    </div>
  )
}
