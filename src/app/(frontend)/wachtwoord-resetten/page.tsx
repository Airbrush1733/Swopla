import React from 'react'

import WachtwoordResettenForm from './WachtwoordResettenForm'

export default async function WachtwoordResettenPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams

  if (!token) {
    return (
      <div className="pagina pagina--smal">
        <h1>Ongeldige link</h1>
        <p className="pagina__intro">Er ontbreekt een resetcode in deze link.</p>
      </div>
    )
  }

  return (
    <div className="pagina pagina--smal">
      <h1>Nieuw wachtwoord instellen</h1>

      <WachtwoordResettenForm token={token} />
    </div>
  )
}
