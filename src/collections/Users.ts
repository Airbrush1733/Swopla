import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'

/**
 * Anonimiseer-routine bij accountverwijdering (besloten, zie
 * technische-architectuur-schets.md → "Bouwstatus"): zodra account_status naar
 * 'geanonimiseerd' verandert (ongeacht welke UI dat aanroept — er is nog geen
 * "account verwijderen"-knop gebouwd, dit is de kant die daar straks op aansluit),
 * worden naam/email/avatar/locatie_exact automatisch gescrubd. Gekoppelde
 * ShopItems/TradeProposals/ProposalMessages blijven bestaan, zoals besloten.
 *
 * Bewust NIET meegenomen: het wachtwoord ongeldig maken. Dat raakt Payload's
 * eigen auth-hooks en is een aparte, kleine vervolgstap als dat nodig blijkt —
 * niet stilzwijgend hier toegevoegd.
 */
const anonimiseerBijStatuswijziging: CollectionBeforeChangeHook = ({ data, operation, originalDoc }) => {
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
  auth: true,
  hooks: {
    beforeChange: [anonimiseerBijStatuswijziging],
  },
  fields: [
    // Email + wachtwoord komen automatisch mee via auth: true

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
          'Precieze coördinaten. Pas delen na een bevestigde afspraak (fysieke veiligheid) — dit veld regelt alleen opslag, niet wanneer het getoond wordt.',
      },
    },

    // --- Verificatie ---
    {
      name: 'geverifieerd_email',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description:
          'Beide verificatievelden moeten true zijn voordat een gebruiker een TradeProposal mag starten of accepteren (afgedwongen in TradeProposals, niet hier).',
      },
    },
    {
      name: 'geverifieerd_telefoon',
      type: 'checkbox',
      defaultValue: false,
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
          'Breed, statisch signaal — vervangt het vervallen WishlistItems. Kan op elke diepte in de categorieboom staan.',
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
