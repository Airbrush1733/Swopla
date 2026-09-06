'use client'

import React, { useActionState } from 'react'

import { login, type InloggenState } from './actions'
import FormFoutmelding from '@/components/FormFoutmelding'

const initialState: InloggenState = { error: null }

export default function InloggenForm({ next }: { next: string }) {
  const [state, formAction, bezig] = useActionState(login, initialState)

  return (
    <form action={formAction} className="formulier">
      <input type="hidden" name="next" value={next} />

      {state.error && <FormFoutmelding bericht={state.error} />}

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
          autoComplete="current-password"
        />
      </div>

      <button
        type="submit"
        className="swopla-btn swopla-btn--primair"
        style={{ width: '100%' }}
        disabled={bezig}
      >
        {bezig ? 'Bezig...' : 'Inloggen'}
      </button>
    </form>
  )
}
