/**
 * Seedt de goedgekeurde v1-basis van 13 hoofdcategorieën + subcategorieën
 * (zie concept-samenvatting.md → "Categorieën: v1-basis"). Idempotent: bestaande
 * categorieën (op basis van slug) worden overgeslagen, niet gedupliceerd.
 *
 * Runnen: npx tsx scripts/seedCategories.ts
 */
import { config as loadEnv } from 'dotenv'
loadEnv()

// Dynamische imports i.p.v. statische — in ESM worden gewone imports
// gehesen en dus VOOR loadEnv() uitgevoerd, waardoor payload.config.ts
// process.env.PAYLOAD_SECRET nog leeg zou zien. Dynamic import() draait
// pas na de code erboven.
const { getPayload } = await import('payload')
const { default: config } = await import('../src/payload.config.js')

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/&/g, 'en')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // diakritische tekens weg
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

const CATEGORIEEN: { naam: string; subs: string[] }[] = [
  { naam: 'Elektronica', subs: ['Telefoons & tablets', 'Computers & laptops', 'Foto & video', 'Audio & hifi', 'Gaming', 'Overig'] },
  { naam: "Auto's, Motoren & Onderdelen", subs: ['Auto-onderdelen', 'Motor-onderdelen', 'Banden & velgen', 'Voertuiggereedschap', 'Accessoires'] },
  { naam: 'Fietsen & Accessoires', subs: ['Stadsfietsen', 'Racefietsen & MTB', 'Elektrische fietsen', 'Onderdelen & accessoires'] },
  { naam: 'Boeken, Films & Muziek', subs: ['Boeken', "Vinyl & cd's", "Dvd's & Blu-ray", 'Games (fysiek)'] },
  { naam: 'Muziekinstrumenten', subs: ['Gitaren & versterkers', 'Toetsinstrumenten', 'Slaginstrumenten', 'Blaasinstrumenten', 'Overig'] },
  { naam: 'Kleding & Accessoires', subs: ['Dames', 'Heren', 'Kinderkleding', 'Schoenen', 'Tassen & sieraden'] },
  { naam: 'Sport & Fitness', subs: ['Fitnessapparatuur', 'Outdoor & kamperen', 'Watersport', 'Wintersport', 'Balsporten'] },
  { naam: 'Huis & Inrichting', subs: ['Meubels', 'Verlichting', 'Woondecoratie', 'Keuken & servies', 'Tuinmeubels'] },
  { naam: 'Tuin & Klussen', subs: ['Tuingereedschap', 'Elektrisch gereedschap', 'Handgereedschap', 'Bouwmaterialen'] },
  { naam: 'Kind & Baby', subs: ['Speelgoed', 'Kinderwagens & autostoeltjes', 'Babyuitzet', 'Kinderfietsen'] },
  { naam: 'Huisdieren', subs: ['Hondenbenodigdheden', 'Kattenbenodigdheden', 'Overige huisdieren'] },
  { naam: 'Verzamelen & Hobby', subs: ['Verzamelobjecten', 'Kunst & antiek', 'Postzegels & munten', 'Modelbouw'] },
  { naam: 'Diversen', subs: ['Overig'] },
]

async function upsertCategory(payload: Awaited<ReturnType<typeof getPayload>>, naam: string, slug: string, parent?: number) {
  const existing = await payload.find({
    collection: 'categories',
    where: { slug: { equals: slug } },
    limit: 1,
  })
  if (existing.docs.length > 0) {
    console.log(`  ↷ bestaat al: ${naam} (${slug})`)
    return existing.docs[0].id as number
  }
  const created = await payload.create({
    collection: 'categories',
    data: { naam, slug, ...(parent ? { parent } : {}) },
  })
  console.log(`  + aangemaakt: ${naam} (${slug})`)
  return created.id as number
}

async function run() {
  const payload = await getPayload({ config })

  for (const hoofd of CATEGORIEEN) {
    const hoofdSlug = slugify(hoofd.naam)
    console.log(`\n${hoofd.naam}`)
    const hoofdId = await upsertCategory(payload, hoofd.naam, hoofdSlug)

    for (const sub of hoofd.subs) {
      const subSlug = `${hoofdSlug}-${slugify(sub)}`
      await upsertCategory(payload, sub, subSlug, hoofdId)
    }
  }

  console.log('\nKlaar.')
  process.exit(0)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
