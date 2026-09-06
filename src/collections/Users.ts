import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'

/**
 * Basis-URL van de site voor links in e-mails (verificatie, wachtwoord-reset). Payload kent
 * geen vaste `serverURL` in dit project (niet ingesteld in payload.config.ts), dus deze komt
 * uit een eigen env-var. `NEXT_PUBLIC_APP_URL` moet lokaal (.env.local) en in Vercel
 * (productie) gezet worden, zie technische-architectuur-schets.md → "Frontend: Login &
 * registratie". Valt terug op localhost voor lokale ontwikkeling zonder die env-var.
 */
function siteUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}

/**
 * Anonimiseer-routine bij accountverwijdering (besloten, zie
 * technische-architectuur-schets.md → "Bouwstatus"): zodra account_status naar
 * 'geanonimiseerd' verandert (ongeacht welke UI dat aanroept, er is nog geen
 * "account verwijderen"-knop gebouwd, dit is de kant die daar straks op aansluit),
 * worden naam/email/avatar/locatie_exact automatisch gescrubd. Gekoppelde
 * ShopItems/TradeProposals/ProposalMessages blijven bestaan, zoals besloten.
 *
 * Bewust NIET meegenomen: het wachtwoord ongeldig maken. Dat raakt Payload's
 * eigen auth-hooks en is een aparte, kleine vervolgstap als dat nodig blijkt,
 * niet stilzwijgend hier toegevoegd.
 */
const anonimiseerBijStatuswijziging: CollectionBeforeChangeHook = ({
  data,
  operation,
  originalDoc,
}) => {
  if (operation !== 'update') {
    return data
  }

  const wordtGeanonimiseerd =
    data.account_status === 'geanonimiseerd' && originalDoc?.account_status !== 'geanonimiseerd'

  if (!wordtGeanonimiseerd) {
    return data
  }

  return {
    ...data,
    avatar: null,
    email: `geanonimiseerd-${originalDoc.id}@swopla.invalid`,
    locatie_exact: null,
    naam: 'Verwijderde gebruiker',
  }
}

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['naam', 'email', 'account_status', 'onboarding_voltooid'],
  },
  auth: {
    // E-mailverificatie verplicht voor inloggen (besloten, zie technische-architectuur-schets.md
    // → "Frontend: Login & registratie"): Payload blokkeert inloggen zelf al zolang _verified
    // niet true is, geen extra code nodig hiervoor. De links in de e-mail wijzen naar onze eigen
    // frontend-pagina's i.p.v. Payload's admin-UI, die bestaat niet voor eindgebruikers.
    verify: {
      generateEmailHTML: ({ token }) =>
        `<p>Welkom bij Swopla!</p><p>Klik op de link hieronder om je e-mailadres te bevestigen en je account te activeren:</p><p><a href="${siteUrl()}/verifieer-email?token=${token}">${siteUrl()}/verifieer-email?token=${token}</a></p>`,
      generateEmailSubject: () => 'Bevestig je e-mailadres voor Swopla',
    },
    forgotPassword: {
      generateEmailHTML: ({ token } = {}) =>
        `<p>Je hebt een nieuw wachtwoord aangevraagd voor je Swopla-account.</p><p><a href="${siteUrl()}/wachtwoord-resetten?token=${token}">${siteUrl()}/wachtwoord-resetten?token=${token}</a></p><p>Heb je dit niet zelf aangevraagd? Dan kun je deze e-mail negeren, er verandert niets aan je account.</p>`,
      generateEmailSubject: () => 'Wachtwoord opnieuw instellen voor Swopla',
    },
  },
  hooks: {
    beforeChange: [anonimiseerBijStatuswijziging],
  },
  fields: [
    // Email + wachtwoord komen automatisch mee via de auth-configuratie hierboven

    {
      name: 'naam',
      type: 'text',
      // Bewust NIET required op schemaniveau (zou een NOT NULL-migratieprobleem geven
      // voor al bestaande gebruikers zonder naam). Afdwingen gebeurt via de
      // onboarding-flow, niet via de database.
    },
    {
      name: 'avatar',
      type: 'upload',
      relationTo: 'media',
    },

    // --- Locatie ---
    {
      name: 'locatie_ruw',
      type: 'text',
      admin: {
        description:
          'Wijk-/postcode-niveau, standaard zichtbaar voor anderen (bv. "1017 CJ" of "Amsterdam-Zuid").',
      },
    },
    {
      name: 'locatie_exact',
      type: 'point',
      admin: {
        description:
          'Precieze coördinaten. Pas delen na een bevestigde afspraak (fysieke veiligheid). Dit veld regelt alleen opslag, niet wanneer het getoond wordt.',
      },
    },

    // --- Verificatie ---
    {
      name: 'geverifieerd_email',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description:
          'Wordt automatisch true gezet zodra iemand de verificatielink uit de registratie-e-mail volgt (zie /verifieer-email en Payload\'s eigen _verified-veld). Voor v1 het enige verificatieveld dat verplicht is voor een TradeProposal (afgedwongen in TradeProposals, niet hier), telefoonverificatie is bewust uitgesteld, zie technische-architectuur-schets.md → "Frontend: Login & registratie".',
      },
    },
    {
      name: 'geverifieerd_telefoon',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description:
          'Nog niet gebouwd in v1 (geen SMS-provider aangesloten), blijft voor iedereen false tot telefoonverificatie een latere bouwstap wordt.',
      },
    },

    // --- Intern / anti-misbruik ---
    {
      name: 'signup_device_ip',
      type: 'text',
      admin: {
        hidden: true,
        description: 'Intern, geen gebruikersinput. Voor sockpuppet-/collusiedetectie.',
      },
    },

    // --- Trackrecord (denormalized tellers) ---
    {
      name: 'voltooide_ruilen',
      type: 'number',
      defaultValue: 0,
      admin: {
        readOnly: true,
        description:
          'Denormalized teller. Wordt automatisch +1 gezet voor beide deelnemers zodra een TradeProposal op "Voltooid" komt (zie hooks in TradeProposals.ts).',
      },
    },
    {
      name: 'ingetrokken_of_geweigerd',
      type: 'number',
      defaultValue: 0,
      admin: {
        readOnly: true,
        description:
          'Denormalized teller. +1 voor beide deelnemers bij "Verlopen"; +1 alleen voor wie intrekt bij "Ingetrokken"; GEEN wijziging bij "Geweigerd" (zie hooks in TradeProposals.ts).',
      },
    },
    {
      name: 'laatst_actief',
      type: 'date',
    },

    // --- Instellingen ---
    {
      name: 'ai_onderhandelhulp_aan',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Simpele aan/uit-schakelaar, geen niveau-instelling.',
      },
    },
    {
      name: 'geschiedenis_gebruik_aan',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description:
          'Aan/uit-beheer voor gebruik van ViewHistory/SearchHistory in suggesties/matching.',
      },
    },

    // --- Interesses ---
    {
      name: 'interesses',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: true,
      admin: {
        description:
          'Breed, statisch signaal, vervangt het vervallen WishlistItems. Kan op elke diepte in de categorieboom staan.',
      },
    },

    // --- Onboarding & accountstatus ---
    {
      name: 'onboarding_voltooid',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description:
          'Wordt true zodra de verplichte intake (interesses + locatie) na registratie is doorlopen. Zolang false: gebruiker naar intake-flow i.p.v. Ontdekken.',
      },
    },
    {
      name: 'account_status',
      type: 'select',
      defaultValue: 'actief',
      options: [
        { label: 'Actief', value: 'actief' },
        { label: 'Geanonimiseerd', value: 'geanonimiseerd' },
      ],
      admin: {
        description:
          'Bij accountverwijdering: Geanonimiseerd i.p.v. hard delete. Zodra dit veld naar Geanonimiseerd gaat, scrubt een hook automatisch naam/email/avatar/locatie_exact. Gekoppelde ShopItems/TradeProposals/ProposalMessages blijven bestaan.',
      },
    },
  ],
}
