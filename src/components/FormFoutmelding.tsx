import React from 'react'

/**
 * Nette, inline foutmelding boven een formulier (login, registreren, wachtwoord-vergeten,
 * wachtwoord-resetten). Vervangt het "throw new Error(...) in een form action"-patroon dat
 * daarvoor gebruikt werd: dat liet Next.js zijn ingebouwde, volledige foutpagina tonen bij een
 * verwachte validatiefout (bv. "e-mailadres al in gebruik"), geen prettige ervaring. Zie de
 * bijbehorende *Form.tsx client-componenten, die dit met useActionState afvangen.
 */
export default function FormFoutmelding({ bericht }: { bericht: string }) {
  return (
    <div
      role="alert"
      style={{
        background: 'oklch(96% 0.03 25)',
        border: '1px solid oklch(85% 0.08 25)',
        color: 'oklch(45% 0.16 25)',
        borderRadius: 10,
        padding: '12px 16px',
        fontSize: 13.5,
        fontWeight: 600,
        lineHeight: 1.5,
        marginBottom: 18,
      }}
    >
      {bericht}
    </div>
  )
}
