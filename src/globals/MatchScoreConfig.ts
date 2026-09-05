import type { GlobalConfig } from 'payload'

/**
 * Eén platformbrede configuratie voor alle matchscore-gewichten (besloten: altijd
 * configureerbaar, nooit hardcoded). Bewerkbaar in de Payload admin-UI zonder codewijziging.
 *
 * Twee losse scores (besloten, zie concept-samenvatting.md → "Productmatch vs. Marieke-match"):
 * een item-gebonden Productmatch en een persoons-/shopgebonden Marieke-match.
 */
export const MatchScoreConfig: GlobalConfig = {
  slug: 'match-score-config',
  admin: {
    description:
      'Matchscore-gewichten. Exacte getallen nog niet besloten, richting/volgorde staat vast, huidige waardes zijn placeholders.',
  },
  fields: [
    {
      type: 'collapsible',
      label: 'Productmatch (item-gebonden)',
      fields: [
        {
          name: 'gewicht_productmatch_specifiek',
          type: 'number',
          defaultValue: 70,
          admin: {
            description:
              'Weging van overlap tussen ShopItems.gewenst_terug en het aanbod van de bezoeker, wanneer dat veld is ingevuld.',
          },
        },
        {
          name: 'gewicht_productmatch_algemeen',
          type: 'number',
          defaultValue: 40,
          admin: {
            description:
              'Weging van de gewone aanbod-vraag/Interesses-overlap, gebruikt wanneer gewenst_terug leeg is. Lager dan het specifieke gewicht.',
          },
        },
        {
          name: 'gewicht_staat_en_waarde',
          type: 'number',
          defaultValue: 20,
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Marieke-match (persoons-/shopgebonden)',
      fields: [
        {
          name: 'gewicht_aanbod_vraag_overlap',
          type: 'number',
          defaultValue: 30,
          admin: { description: 'Shop-brede overlap.' },
        },
        {
          name: 'gewicht_locatie',
          type: 'number',
          defaultValue: 20,
        },
        {
          name: 'gewicht_betrouwbaarheid',
          type: 'number',
          defaultValue: 20,
        },
        {
          name: 'gewicht_sociaal',
          type: 'number',
          defaultValue: 15,
        },
        {
          name: 'gewicht_reviews',
          type: 'number',
          defaultValue: 0,
          admin: { description: 'Optioneel, mag later, vandaar default 0.' },
        },
        {
          name: 'locatie_weging_ophalen_vs_verzenden',
          type: 'number',
          defaultValue: 50,
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Ontdekken-sortering ("Beste match")',
      fields: [
        {
          name: 'gewicht_ontdekken_gewenst_terug',
          type: 'number',
          defaultValue: 60,
          admin: { description: 'Weegt het zwaarst, actiefste signaal.' },
        },
        {
          name: 'gewicht_ontdekken_zoekgeschiedenis',
          type: 'number',
          defaultValue: 30,
        },
        {
          name: 'gewicht_ontdekken_interesses',
          type: 'number',
          defaultValue: 10,
          admin: {
            description:
              'Breedste, meest passieve signaal, ook de terugval wanneer de twee bovenstaande ontbreken.',
          },
        },
        {
          name: 'ontdekken_hoge_match_drempel',
          type: 'number',
          defaultValue: 75,
          admin: {
            description:
              'Percentage vanaf waar een item gegarandeerd op de eerste pagina/regels staat (besloten: 75). Volgorde binnen deze band mag door elkaar lopen.',
          },
        },
      ],
    },
  ],
}
