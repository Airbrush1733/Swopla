'use client'

import React, { useActionState } from 'react'

import { registreer, type RegistrerenState } from './actions'
import FormFoutmelding from '@/components/FormFoutmelding'

const initialState: RegistrerenState = { error: null }

export default function RegistrerenForm() {
  const [state, formAction, bezig] = useActionState(registreer, initialState)

  return (
    <form action={formAction} className="formulier">
      {state.error && <FormFoutmelding bericht={state.error} />}

      <div className="veld">
        <label className="veld__label" htmlFor="naam">
          Naam *
        </label>
        <input type="text" id="naam" name="naam" required autoComplete="name" />
      </div>

      <div className="veld">
        <label className="veld__label" htmlFor="email">
          E-mailadres *
        </label>
        <input type="email" id="email" name="email" required autoComplete="email" />
      </div>

      <div className="veld">
        <label className="veld__label" htmlFor="wachtwoord">
          Wachtwoord *
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
          Herhaal wachtwoord *
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
        {bezig ? 'Bezig...' : 'Account aanmaken'}
      </button>
    </form>
  )
}
