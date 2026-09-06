import Link from 'next/link'
import React from 'react'

export default function BevestigEmailPage() {
  return (
    <div className="pagina pagina--smal">
      <h1>Check je e-mail</h1>
      <p className="pagina__intro">
        We hebben je een e-mail gestuurd met een link om je e-mailadres te bevestigen. Klik op die
        link om je account te activeren, daarna kun je inloggen.
      </p>
      <p style={{ fontSize: 13.5, color: 'var(--swopla-grijs)' }}>
        Niets ontvangen? Check ook je spam-map. Al bevestigd?{' '}
        <Link href="/inloggen">Log hier in</Link>.
      </p>
    </div>
  )
}
