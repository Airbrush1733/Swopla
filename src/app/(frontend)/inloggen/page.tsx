import Link from 'next/link'
import React from 'react'

import InloggenForm from './InloggenForm'

export default async function InloggenPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams

  return (
    <div className="pagina pagina--smal">
      <h1>Inloggen</h1>
      <p className="pagina__intro">Log in met je e-mailadres en wachtwoord.</p>

      <InloggenForm next={next ?? ''} />

      <p style={{ fontSize: 13.5, color: 'var(--swopla-grijs)', marginTop: 20 }}>
        <Link href="/wachtwoord-vergeten">Wachtwoord vergeten?</Link>
      </p>
      <p style={{ fontSize: 13.5, color: 'var(--swopla-grijs)' }}>
        Nog geen account? <Link href="/registreren">Maak er gratis een aan</Link>.
      </p>
    </div>
  )
}
