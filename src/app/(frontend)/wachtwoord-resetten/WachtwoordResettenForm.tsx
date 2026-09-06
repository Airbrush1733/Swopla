'use client'

import React, { useActionState } from 'react'

import { resetWachtwoord, type WachtwoordResettenState } from './actions'
import FormFoutmelding from '@/components/FormFoutmelding'

const initialState: WachtwoordResettenState = { error: null }

export default function WachtwoordResettenForm({ token }: { token: string }) {
  const [state, formAction, bezig] = useActionState(resetWachtwoord, initialState)

  return (
    <form action={formAction} className="formulier">
      <input type="hidden" name="token" value={token} />

      {state.error && <FormFoutmelding bericht={state.error} />}

      <div className="veld">
        <label className="veld__label" htmlFor="wachtwoord">
          Nieuw wachtwoord *
        </label>
        <input
          type="password"
          id="wachtwoord"
          name="wachtwoord"
          required
          minLength={8}
          autoComplete="new-password"
        />
        <p className="veld__hint">Minstens 8 tekens.</p>
      </div>

      <div className="veld">
        <label className="veld__label" htmlFor="wachtwoord_bevestig">
          Herhaal nieuw wachtwoord *
        </label>
        <input
          type="password"
          id="wachtwoord_bevestig"
          name="wachtwoord_bevestig"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>

      <button
        type="submit"
        className="swopla-btn swopla-btn--primair"
        style={{ width: '100%' }}
        disabled={bezig}
      >
        {bezig ? 'Bezig...' : 'Wachtwoord instellen'}
      </button>
    </form>
  )
}
