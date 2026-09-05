/**
 * Verwijdert alle shop-items en media (test-foto's) zodat seedTestData.ts ze
 * schoon opnieuw kan aanmaken. Nodig omdat de vorige seed-run draaide zonder
 * geldige BLOB_READ_WRITE_TOKEN en daardoor kapotte foto-URL's opleverde
 * (zie payload.config.ts -- de token heet hier SWOPLAPUBLIC_READ_WRITE_TOKEN,
 * niet BLOB_READ_WRITE_TOKEN, dat is inmiddels gefixt).
 *
 * Users en categorieen blijven staan, alleen shop-items en media worden
 * gewist. Puur test-/seeddata, dus veilig om te verwijderen.
 *
 * Runnen: npx tsx scripts/resetShopData.ts
 * Daarna: npx tsx scripts/seedTestData.ts
 */
import { config as loadEnv } from 'dotenv'
loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('../src/payload.config.js')

const payload = await getPayload({ config })

async function verwijderAlles(collection: 'shop-items' | 'media') {
  let verwijderd = 0
  for (;;) {
    const res = await payload.find({ collection, limit: 100, depth: 0 })
    if (res.docs.length === 0) break
    for (const doc of res.docs) {
      await payload.delete({ collection, id: doc.id })
      verwijderd++
    }
  }
  console.log(`${verwijderd} documenten verwijderd uit "${collection}"`)
}

await verwijderAlles('shop-items')
await verwijderAlles('media')

console.log('Klaar. Draai nu: npx tsx scripts/seedTestData.ts')
process.exit(0)
