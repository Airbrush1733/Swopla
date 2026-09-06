import React from 'react'

import WachtwoordVergetenForm from './WachtwoordVergetenForm'

export default function WachtwoordVergetenPage() {
  return (
    <div className="pagina pagina--smal">
      <h1>Wachtwoord vergeten</h1>
      <p className="pagina__intro">
        Vul je e-mailadres in, dan sturen we je een link om een nieuw wachtwoord in te stellen.
      </p>

      <WachtwoordVergetenForm />
    </div>
  )
}
