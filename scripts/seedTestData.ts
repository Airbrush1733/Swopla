/**
 * Seedt v1-testdata: 5 gebruikers met een goedgevulde shop (5-10 ShopItems
 * elk, incl. foto's), verspreid over alle 13 hoofdcategorieën, in 1 land
 * (Nederland) maar verschillende steden.
 *
 * Foto's komen van LoremFlickr (keyword-gematcht, gratis, geen auth nodig),
 * met Picsum als fallback als LoremFlickr een keer niet reageert. Ze worden
 * echt gedownload en via Payload's upload-flow opgeslagen — dus in Vercel
 * Blob (zie payload.config.ts), niet lokaal op schijf. Daardoor werken ze
 * ook meteen op de live site.
 *
 * Idempotent: bestaande gebruikers (op e-mail) en bestaande items (op
 * eigenaar + titel) worden overgeslagen, niet gedupliceerd. Je kunt dit
 * script dus veilig opnieuw draaien.
 *
 * Runnen: npx tsx scripts/seedTestData.ts
 */
import { config as loadEnv } from 'dotenv'
loadEnv()

const { getPayload } = await import('payload')
const { default: config } = await import('../src/payload.config.js')

const TEST_WACHTWOORD = 'SwoplaTest2026!'

type Overdracht = 'ophalen' | 'verzenden'
type Staat = 'nieuwstaat' | 'zo_goed_als_nieuw' | 'gebruikssporen' | 'duidelijke_gebruikssporen'
type Waarde = 'laag' | 'midden' | 'hoog'
type CategoriePad = [hoofd: string, sub?: string]

type ItemDef = {
  titel: string
  beschrijving: string
  categorie: CategoriePad
  gewenstTerug?: CategoriePad
  staat: Staat
  waarde: Waarde
  overdracht: Overdracht[]
  fotoKeyword: string
}

type GebruikerDef = {
  naam: string
  email: string
  locatieRuw: string
  locatieExact: [number, number]
  interesses: CategoriePad[]
  items: ItemDef[]
}

const GEBRUIKERS: GebruikerDef[] = []

GEBRUIKERS.push({
  naam: 'Sanne de Boer',
  email: 'sanne.deboer@swopla-test.nl',
  locatieRuw: 'Amsterdam-Centrum',
  locatieExact: [4.9041, 52.3676],
  interesses: [
    ['Fietsen & Accessoires', 'Racefietsen & MTB'],
    ['Fietsen & Accessoires', 'Elektrische fietsen'],
    ['Sport & Fitness', 'Fitnessapparatuur'],
  ],
  items: [
    {
      titel: 'iPhone 12 (128GB)',
      beschrijving: 'Nette iPhone 12, 128GB opslag, altijd met hoesje gebruikt. Batterij nog prima. Inclusief oplader.',
      categorie: ['Elektronica', 'Telefoons & tablets'],
      gewenstTerug: ['Elektronica', 'Computers & laptops'],
      staat: 'zo_goed_als_nieuw',
      waarde: 'hoog',
      overdracht: ['ophalen', 'verzenden'],
      fotoKeyword: 'iphone,smartphone',
    },
    {
      titel: 'MacBook Air M1',
      beschrijving: 'MacBook Air uit 2021, M1-chip, 8GB RAM. Werkt vlekkeloos, wel wat gebruikssporen op de behuizing.',
      categorie: ['Elektronica', 'Computers & laptops'],
      staat: 'gebruikssporen',
      waarde: 'hoog',
      overdracht: ['ophalen'],
      fotoKeyword: 'macbook,laptop',
    },
    {
      titel: 'PlayStation 5 + 2 controllers',
      beschrijving: 'PS5 schijf-editie met twee DualSense controllers. Weinig gebruikt, alle kabels aanwezig.',
      categorie: ['Elektronica', 'Gaming'],
      gewenstTerug: ['Fietsen & Accessoires', 'Racefietsen & MTB'],
      staat: 'zo_goed_als_nieuw',
      waarde: 'hoog',
      overdracht: ['ophalen', 'verzenden'],
      fotoKeyword: 'playstation,gaming-console',
    },
    {
      titel: 'Bose noise-cancelling koptelefoon',
      beschrijving: 'Bose QC-koptelefoon, uitstekende noise cancelling. Doosje en kabel erbij.',
      categorie: ['Elektronica', 'Audio & hifi'],
      staat: 'zo_goed_als_nieuw',
      waarde: 'midden',
      overdracht: ['verzenden'],
      fotoKeyword: 'headphones',
    },
    {
      titel: 'Canon EOS spiegelreflexcamera + lens',
      beschrijving: 'Canon EOS met 18-55mm kitlens. Prima voor wie wil leren fotograferen, wel wat gebruikssporen.',
      categorie: ['Elektronica', 'Foto & video'],
      gewenstTerug: ['Muziekinstrumenten', 'Gitaren & versterkers'],
      staat: 'gebruikssporen',
      waarde: 'hoog',
      overdracht: ['ophalen'],
      fotoKeyword: 'dslr,camera',
    },
    {
      titel: 'Verzameling fantasy-boeken (10 delen)',
      beschrijving: 'Complete fantasyreeks, 10 paperbacks, goed leesbaar. Voor liefhebbers van het genre.',
      categorie: ['Boeken, Films & Muziek', 'Boeken'],
      staat: 'gebruikssporen',
      waarde: 'laag',
      overdracht: ['ophalen', 'verzenden'],
      fotoKeyword: 'books,fantasy-novels',
    },
  ],
})

GEBRUIKERS.push({
  naam: 'Youssef El Amrani',
  email: 'youssef.elamrani@swopla-test.nl',
  locatieRuw: 'Utrecht-Oost',
  locatieExact: [5.1214, 52.0907],
  interesses: [
    ['Elektronica', 'Telefoons & tablets'],
    ['Elektronica', 'Gaming'],
    ['Elektronica', 'Foto & video'],
  ],
  items: [
    {
      titel: 'Racefiets Cube Attain',
      beschrijving: 'Cube Attain racefiets, maat 56. Goed onderhouden, kleine gebruikssporen op het frame.',
      categorie: ['Fietsen & Accessoires', 'Racefietsen & MTB'],
      gewenstTerug: ['Sport & Fitness', 'Fitnessapparatuur'],
      staat: 'gebruikssporen',
      waarde: 'hoog',
      overdracht: ['ophalen'],
      fotoKeyword: 'road-bike,bicycle',
    },
    {
      titel: 'E-bike Gazelle',
      beschrijving: 'Gazelle elektrische fiets, accu doet het nog prima. Weinig gebruikt afgelopen jaar.',
      categorie: ['Fietsen & Accessoires', 'Elektrische fietsen'],
      staat: 'zo_goed_als_nieuw',
      waarde: 'hoog',
      overdracht: ['ophalen'],
      fotoKeyword: 'electric-bicycle,ebike',
    },
    {
      titel: 'Fietstas set + verlichting',
      beschrijving: 'Set van twee fietstassen plus een set led-verlichting voor/achter, nog in verpakking.',
      categorie: ['Fietsen & Accessoires', 'Onderdelen & accessoires'],
      staat: 'nieuwstaat',
      waarde: 'laag',
      overdracht: ['verzenden'],
      fotoKeyword: 'bicycle-panniers,bike-accessories',
    },
    {
      titel: 'Halterset 40kg',
      beschrijving: 'Verstelbare haltersstangen met schijven, totaal 40kg. Prima voor thuis trainen.',
      categorie: ['Sport & Fitness', 'Fitnessapparatuur'],
      gewenstTerug: ['Sport & Fitness', 'Outdoor & kamperen'],
      staat: 'gebruikssporen',
      waarde: 'midden',
      overdracht: ['ophalen'],
      fotoKeyword: 'dumbbells,weights',
    },
    {
      titel: 'Tent 4-persoons',
      beschrijving: 'Ruime 4-persoonstent, een keer gebruikt op een festival. Compleet met haringen en tas.',
      categorie: ['Sport & Fitness', 'Outdoor & kamperen'],
      staat: 'zo_goed_als_nieuw',
      waarde: 'midden',
      overdracht: ['ophalen', 'verzenden'],
      fotoKeyword: 'camping-tent',
    },
    {
      titel: 'Snowboard + bindingen',
      beschrijving: 'Snowboard 155cm met bindingen, een paar seizoenen gebruikt maar nog prima glijvlak.',
      categorie: ['Sport & Fitness', 'Wintersport'],
      gewenstTerug: ['Sport & Fitness', 'Balsporten'],
      staat: 'gebruikssporen',
      waarde: 'midden',
      overdracht: ['ophalen'],
      fotoKeyword: 'snowboard',
    },
    {
      titel: 'Voetbaltas met ballen en pionnen',
      beschrijving: 'Trainerstas met 5 voetballen en een setje pionnen, ideaal voor een amateurteam.',
      categorie: ['Sport & Fitness', 'Balsporten'],
      staat: 'gebruikssporen',
      waarde: 'laag',
      overdracht: ['ophalen', 'verzenden'],
      fotoKeyword: 'soccer-ball,football',
    },
  ],
})

GEBRUIKERS.push({
  naam: 'Fleur Jansen',
  email: 'fleur.jansen@swopla-test.nl',
  locatieRuw: 'Rotterdam-Kralingen',
  locatieExact: [4.4777, 51.9244],
  interesses: [
    ['Kleding & Accessoires', 'Dames'],
    ['Kleding & Accessoires', 'Schoenen'],
    ['Kleding & Accessoires', 'Tassen & sieraden'],
  ],
  items: [
    {
      titel: 'Vintage eettafel + 4 stoelen',
      beschrijving: 'Massief houten eettafel met vier bijpassende stoelen, jaren 70 stijl. Gebruikssporen passend bij de leeftijd.',
      categorie: ['Huis & Inrichting', 'Meubels'],
      gewenstTerug: ['Huis & Inrichting', 'Woondecoratie'],
      staat: 'gebruikssporen',
      waarde: 'hoog',
      overdracht: ['ophalen'],
      fotoKeyword: 'dining-table,wooden-furniture',
    },
    {
      titel: 'Muurschilderij abstract',
      beschrijving: 'Groot abstract schilderij, 100x70cm, past goed boven een bank. Nooit opgehangen geweest.',
      categorie: ['Huis & Inrichting', 'Woondecoratie'],
      staat: 'nieuwstaat',
      waarde: 'laag',
      overdracht: ['ophalen', 'verzenden'],
      fotoKeyword: 'abstract-painting,wall-art',
    },
    {
      titel: 'Serviesset 12-delig',
      beschrijving: 'Compleet serviesset voor 6 personen, borden en kommen, geen barsten of chips.',
      categorie: ['Huis & Inrichting', 'Keuken & servies'],
      staat: 'zo_goed_als_nieuw',
      waarde: 'midden',
      overdracht: ['ophalen', 'verzenden'],
      fotoKeyword: 'dinnerware,ceramic-plates',
    },
    {
      titel: 'Design vloerlamp',
      beschrijving: 'Zwarte design vloerlamp met verstelbare arm. Werkt goed, klein krasje op de voet.',
      categorie: ['Huis & Inrichting', 'Verlichting'],
      gewenstTerug: ['Huis & Inrichting', 'Keuken & servies'],
      staat: 'gebruikssporen',
      waarde: 'midden',
      overdracht: ['ophalen'],
      fotoKeyword: 'floor-lamp',
    },
    {
      titel: 'Grasmaaier (elektrisch)',
      beschrijving: 'Elektrische grasmaaier, kabel van 10 meter inbegrepen. Prima voor een kleine tot middelgrote tuin.',
      categorie: ['Tuin & Klussen', 'Tuingereedschap'],
      staat: 'gebruikssporen',
      waarde: 'midden',
      overdracht: ['ophalen'],
      fotoKeyword: 'lawn-mower',
    },
    {
      titel: 'Accuboormachine Bosch',
      beschrijving: 'Bosch accuboormachine met twee accus en oplader, in koffer met bitjes.',
      categorie: ['Tuin & Klussen', 'Elektrisch gereedschap'],
      gewenstTerug: ['Tuin & Klussen', 'Tuingereedschap'],
      staat: 'zo_goed_als_nieuw',
      waarde: 'midden',
      overdracht: ['ophalen', 'verzenden'],
      fotoKeyword: 'power-drill,cordless-drill',
    },
    {
      titel: 'Loungeset tuinmeubels (3-delig)',
      beschrijving: 'Loungebank, tafel en poef, wicker-look. Kussens zijn wasbaar en zien er nog goed uit.',
      categorie: ['Huis & Inrichting', 'Tuinmeubels'],
      staat: 'gebruikssporen',
      waarde: 'hoog',
      overdracht: ['ophalen'],
      fotoKeyword: 'garden-furniture,patio-lounge',
    },
    {
      titel: 'Restpartij bestrating tegels',
      beschrijving: 'Ongeveer 15m2 grijze terrastegels over van een klus, prima voor een tuinpad of klein terras.',
      categorie: ['Tuin & Klussen', 'Bouwmaterialen'],
      staat: 'gebruikssporen',
      waarde: 'laag',
      overdracht: ['ophalen'],
      fotoKeyword: 'paving-stones,patio-tiles',
    },
  ],
})

GEBRUIKERS.push({
  naam: 'Daan Visser',
  email: 'daan.visser@swopla-test.nl',
  locatieRuw: 'Groningen-Zuid',
  locatieExact: [6.5665, 53.2194],
  interesses: [
    ['Huis & Inrichting', 'Meubels'],
    ['Huis & Inrichting', 'Tuinmeubels'],
    ['Huis & Inrichting', 'Keuken & servies'],
  ],
  items: [
    {
      titel: 'Winterjas dames maat M',
      beschrijving: 'Warme winterjas, maat M, een winter gedragen. Geen vlekken of beschadigingen.',
      categorie: ['Kleding & Accessoires', 'Dames'],
      gewenstTerug: ['Kleding & Accessoires', 'Tassen & sieraden'],
      staat: 'zo_goed_als_nieuw',
      waarde: 'midden',
      overdracht: ['verzenden'],
      fotoKeyword: 'winter-coat',
    },
    {
      titel: 'Pak heren maat 52',
      beschrijving: 'Nette heren kostuum, maat 52, een paar keer gedragen voor bruiloften.',
      categorie: ['Kleding & Accessoires', 'Heren'],
      staat: 'gebruikssporen',
      waarde: 'midden',
      overdracht: ['ophalen'],
      fotoKeyword: 'mens-suit',
    },
    {
      titel: 'Sneakers maat 42',
      beschrijving: 'Witte sneakers, maat 42, regelmatig gedragen maar nog stevig genoeg.',
      categorie: ['Kleding & Accessoires', 'Schoenen'],
      staat: 'gebruikssporen',
      waarde: 'laag',
      overdracht: ['verzenden'],
      fotoKeyword: 'sneakers,shoes',
    },
    {
      titel: 'Leren handtas',
      beschrijving: 'Bruine leren handtas, ruime binnenkant, riem verstelbaar. Lichte gebruikssporen op de bodem.',
      categorie: ['Kleding & Accessoires', 'Tassen & sieraden'],
      staat: 'zo_goed_als_nieuw',
      waarde: 'midden',
      overdracht: ['verzenden'],
      fotoKeyword: 'leather-handbag',
    },
    {
      titel: 'Houten speelkeuken',
      beschrijving: 'Houten speelkeuken met keukengerei, kinderen zijn eroverheen gegroeid.',
      categorie: ['Kind & Baby', 'Speelgoed'],
      gewenstTerug: ['Kind & Baby', 'Kinderfietsen'],
      staat: 'gebruikssporen',
      waarde: 'midden',
      overdracht: ['ophalen'],
      fotoKeyword: 'wooden-toy-kitchen',
    },
    {
      titel: 'Kinderwagen 3-in-1',
      beschrijving: '3-in-1 kinderwagensysteem incl. autostoel en reiswieg. Wielen en frame in goede staat.',
      categorie: ['Kind & Baby', 'Kinderwagens & autostoeltjes'],
      gewenstTerug: ['Kind & Baby', 'Babyuitzet'],
      staat: 'gebruikssporen',
      waarde: 'hoog',
      overdracht: ['ophalen'],
      fotoKeyword: 'baby-stroller',
    },
    {
      titel: 'Loopfietsje',
      beschrijving: 'Houten loopfietsje voor peuters, verstelbaar zadel. Kind is nu op een echte fiets over.',
      categorie: ['Kind & Baby', 'Kinderfietsen'],
      staat: 'gebruikssporen',
      waarde: 'laag',
      overdracht: ['ophalen', 'verzenden'],
      fotoKeyword: 'balance-bike,toddler-bike',
    },
    {
      titel: 'Babykleding pakket 0-6 mnd',
      beschrijving: 'Doos vol babykleding maat 0-6 maanden, rompertjes en setjes, wasbaar op 30 graden.',
      categorie: ['Kind & Baby', 'Babyuitzet'],
      staat: 'zo_goed_als_nieuw',
      waarde: 'laag',
      overdracht: ['verzenden'],
      fotoKeyword: 'baby-clothes',
    },
  ],
})

GEBRUIKERS.push({
  naam: 'Meike Bakker',
  email: 'meike.bakker@swopla-test.nl',
  locatieRuw: 'Eindhoven-Strijp',
  locatieExact: [5.4697, 51.4416],
  interesses: [
    ['Elektronica', 'Foto & video'],
    ['Elektronica', 'Audio & hifi'],
    ['Huis & Inrichting', 'Meubels'],
  ],
  items: [
    {
      titel: 'Postzegelverzameling album',
      beschrijving: 'Album met Nederlandse postzegels uit de jaren 60-80, deels gestempeld, deels postfris.',
      categorie: ['Verzamelen & Hobby', 'Verzamelobjecten'],
      gewenstTerug: ['Verzamelen & Hobby', 'Kunst & antiek'],
      staat: 'gebruikssporen',
      waarde: 'midden',
      overdracht: ['ophalen'],
      fotoKeyword: 'stamp-collection',
    },
    {
      titel: 'Antieke klok',
      beschrijving: 'Antieke pendule, loopt nog goed, klein beschadigd plekje op de wijzerplaat.',
      categorie: ['Verzamelen & Hobby', 'Kunst & antiek'],
      staat: 'gebruikssporen',
      waarde: 'hoog',
      overdracht: ['ophalen'],
      fotoKeyword: 'antique-clock',
    },
    {
      titel: 'Modeltreinset schaal H0',
      beschrijving: 'Complete modeltreinset schaal H0 met rails, trafo en twee locomotieven.',
      categorie: ['Verzamelen & Hobby', 'Modelbouw'],
      staat: 'zo_goed_als_nieuw',
      waarde: 'midden',
      overdracht: ['ophalen', 'verzenden'],
      fotoKeyword: 'model-train-set',
    },
    {
      titel: 'Elektrische gitaar + versterker',
      beschrijving: 'Elektrische gitaar met kleine oefenversterker, ideaal om te leren spelen.',
      categorie: ['Muziekinstrumenten', 'Gitaren & versterkers'],
      gewenstTerug: ['Muziekinstrumenten', 'Toetsinstrumenten'],
      staat: 'gebruikssporen',
      waarde: 'hoog',
      overdracht: ['ophalen'],
      fotoKeyword: 'electric-guitar',
    },
    {
      titel: 'Digitale piano',
      beschrijving: 'Digitale piano met 88 aanslaggevoelige toetsen en onderstel. Weinig bespeeld.',
      categorie: ['Muziekinstrumenten', 'Toetsinstrumenten'],
      staat: 'zo_goed_als_nieuw',
      waarde: 'hoog',
      overdracht: ['ophalen'],
      fotoKeyword: 'digital-piano,keyboard',
    },
    {
      titel: 'Hondenmand + speelgoedset',
      beschrijving: 'Grote hondenmand (wasbare hoes) met een setje speeltjes, nooit door een hond gebruikt (verkeerd besteld).',
      categorie: ['Huisdieren', 'Hondenbenodigdheden'],
      gewenstTerug: ['Huisdieren', 'Kattenbenodigdheden'],
      staat: 'nieuwstaat',
      waarde: 'laag',
      overdracht: ['verzenden'],
      fotoKeyword: 'dog-bed',
    },
    {
      titel: 'Kattenkrabpaal XL',
      beschrijving: 'Kattenkrabpaal, XL formaat met platformen, de kat gebruikt hem helaas niet.',
      categorie: ['Huisdieren', 'Kattenbenodigdheden'],
      staat: 'zo_goed_als_nieuw',
      waarde: 'laag',
      overdracht: ['ophalen', 'verzenden'],
      fotoKeyword: 'cat-scratching-post',
    },
    {
      titel: 'Vinylplaten collectie jaren 70',
      beschrijving: 'Zo\'n 40 vinylplaten uit de jaren 70, mix van rock en soul, goed onderhouden.',
      categorie: ['Boeken, Films & Muziek', "Vinyl & cd's"],
      staat: 'gebruikssporen',
      waarde: 'midden',
      overdracht: ['ophalen'],
      fotoKeyword: 'vinyl-records',
    },
    {
      titel: 'Doos gemengde onderdelen/gereedschap',
      beschrijving: 'Restpartij van de garage: diverse schroeven, klein gereedschap en onderdelen. Alles mag geboden worden.',
      categorie: ['Diversen', 'Overig'],
      staat: 'duidelijke_gebruikssporen',
      waarde: 'laag',
      overdracht: ['ophalen'],
      fotoKeyword: 'tools,hardware',
    },
    {
      titel: 'Set auto-onderdelen (remschijven, filters)',
      beschrijving: 'Nieuwe remschijven en een setje filters, passend op een gangbare middenklasser (specificaties op aanvraag).',
      categorie: ["Auto's, Motoren & Onderdelen", 'Auto-onderdelen'],
      staat: 'gebruikssporen',
      waarde: 'laag',
      overdracht: ['ophalen'],
      fotoKeyword: 'car-parts,brake-disc',
    },
  ],
})

// --- Categorieën opzoeken ---

type CategorieMap = Map<string, number>

async function laadCategorieMap(payload: Awaited<ReturnType<typeof getPayload>>): Promise<CategorieMap> {
  const map: CategorieMap = new Map()
  const alle = await payload.find({ collection: 'categories', limit: 200, depth: 1 })
  for (const doc of alle.docs) {
    const parent = doc.parent as unknown
    if (parent && typeof parent === 'object' && 'naam' in parent) {
      map.set(`${(parent as { naam: string }).naam}::${doc.naam}`, doc.id as number)
    } else {
      map.set(doc.naam as string, doc.id as number)
    }
  }
  return map
}

function resolveCategorie(map: CategorieMap, pad: CategoriePad): number {
  const key = pad[1] ? `${pad[0]}::${pad[1]}` : pad[0]
  const id = map.get(key)
  if (!id) {
    throw new Error(`Categorie niet gevonden: "${key}". Heb je scripts/seedCategories.ts al gedraaid?`)
  }
  return id
}

// --- Foto's downloaden en als Media-doc opslaan ---

let fotoSeed = 1000

async function fetchAfbeelding(keyword: string): Promise<{ data: Buffer; mimetype: string; filename: string }> {
  const lock = fotoSeed++
  const url = `https://loremflickr.com/800/600/${keyword}?lock=${lock}`
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    const res = await fetch(url, { signal: controller.signal, redirect: 'follow' })
    clearTimeout(timeout)
    if (!res.ok) throw new Error(`status ${res.status}`)
    const arrayBuf = await res.arrayBuffer()
    const contentType = res.headers.get('content-type') || 'image/jpeg'
    const ext = contentType.includes('png') ? 'png' : 'jpg'
    return { data: Buffer.from(arrayBuf), mimetype: contentType, filename: `swopla-seed-${lock}.${ext}` }
  } catch (err) {
    console.log(`    ↷ LoremFlickr faalde voor "${keyword}" (${(err as Error).message}), gebruik fallback foto`)
    const res = await fetch(`https://picsum.photos/seed/${lock}/800/600`)
    const arrayBuf = await res.arrayBuffer()
    return { data: Buffer.from(arrayBuf), mimetype: 'image/jpeg', filename: `swopla-seed-fallback-${lock}.jpg` }
  }
}

async function maakFotosAan(
  payload: Awaited<ReturnType<typeof getPayload>>,
  keyword: string,
  alt: string,
  aantal: number,
): Promise<number[]> {
  const ids: number[] = []
  for (let i = 0; i < aantal; i++) {
    const { data, mimetype, filename } = await fetchAfbeelding(keyword)
    const media = await payload.create({
      collection: 'media',
      data: { alt },
      file: { data, mimetype, name: filename, size: data.length },
    })
    ids.push(media.id as number)
  }
  return ids
}

// --- Gebruikers en items aanmaken ---

async function upsertGebruiker(
  payload: Awaited<ReturnType<typeof getPayload>>,
  categorieMap: CategorieMap,
  g: GebruikerDef,
): Promise<number> {
  const bestaand = await payload.find({
    collection: 'users',
    where: { email: { equals: g.email } },
    limit: 1,
  })
  if (bestaand.docs.length > 0) {
    console.log(`↷ gebruiker bestaat al: ${g.email}`)
    return bestaand.docs[0].id as number
  }

  const created = await payload.create({
    collection: 'users',
    data: {
      email: g.email,
      password: TEST_WACHTWOORD,
      naam: g.naam,
      locatie_ruw: g.locatieRuw,
      locatie_exact: g.locatieExact,
      geverifieerd_email: true,
      geverifieerd_telefoon: true,
      onboarding_voltooid: true,
      interesses: g.interesses.map((pad) => resolveCategorie(categorieMap, pad)),
    },
  })
  console.log(`+ gebruiker aangemaakt: ${g.email}`)
  return created.id as number
}

async function upsertShopItem(
  payload: Awaited<ReturnType<typeof getPayload>>,
  categorieMap: CategorieMap,
  eigenaarId: number,
  item: ItemDef,
): Promise<void> {
  const bestaand = await payload.find({
    collection: 'shop-items',
    where: { and: [{ eigenaar: { equals: eigenaarId } }, { titel: { equals: item.titel } }] },
    limit: 1,
  })
  if (bestaand.docs.length > 0) {
    console.log(`  ↷ item bestaat al: ${item.titel}`)
    return
  }

  console.log(`  ... fotos ophalen voor: ${item.titel}`)
  const fotoIds = await maakFotosAan(payload, item.fotoKeyword, item.titel, 2)

  const gewenstTerugId = item.gewenstTerug ? resolveCategorie(categorieMap, item.gewenstTerug) : undefined

  await payload.create({
    collection: 'shop-items',
    data: {
      eigenaar: eigenaarId,
      titel: item.titel,
      beschrijving: item.beschrijving,
      categorie: resolveCategorie(categorieMap, item.categorie),
      fotos: fotoIds,
      staat: item.staat,
      waarde_indicatie: item.waarde,
      overdracht: item.overdracht,
      status: 'beschikbaar',
      gewenst_terug: gewenstTerugId,
    },
  })
  console.log(`  + item aangemaakt: ${item.titel}`)
}

async function run() {
  const payload = await getPayload({ config })
  const categorieMap = await laadCategorieMap(payload)

  for (const g of GEBRUIKERS) {
    console.log(`\n${g.naam} (${g.email})`)
    const gebruikerId = await upsertGebruiker(payload, categorieMap, g)
    for (const item of g.items) {
      await upsertShopItem(payload, categorieMap, gebruikerId, item)
    }
  }

  console.log(`\nKlaar. Testwachtwoord voor alle 5 accounts: ${TEST_WACHTWOORD}`)
  process.exit(0)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
