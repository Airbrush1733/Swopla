'use client'

import React, { useActionState } from 'react'

import { vraagResetAan, type WachtwoordVergetenState } from './actions'
import FormFoutmelding from '@/components/FormFoutmelding'

const initialState: WachtwoordVergetenState = { error: null }

export default function WachtwoordVergetenForm() {
  const [state, formAction, bezig] = useActionState(vraagResetAan, initialState)

  return (
    <form action={formAction} className="formulier">
      {state.error && <FormFoutmelding bericht={state.error} />}

      <div className="veld">
        <label className="veld__label" htmlFor="email">
          E-mailadres *
        </label>
        <input type="email" id="email" name="email" required autoComplete="email" />
      </div>

      <button
        type="submit"
        className="swopla-btn swopla-btn--primair"
        style={{ width: '100%' }}
        disabled={bezig}
      >
        {bezig ? 'Bezig...' : 'Stuur reset-link'}
      </button>
    </form>
  )
}
