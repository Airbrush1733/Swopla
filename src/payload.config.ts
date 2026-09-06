import { postgresAdapter } from '@payloadcms/db-postgres'
import { resendAdapter } from '@payloadcms/email-resend'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Categories } from './collections/Categories'
import { ShopItems } from './collections/ShopItems'
import { TradeProposals } from './collections/TradeProposals'
import { ProposalVersions } from './collections/ProposalVersions'
import { ProposalMessages } from './collections/ProposalMessages'
import { Notifications } from './collections/Notifications'
import { Reports } from './collections/Reports'
import { Disputes } from './collections/Disputes'
import { ViewHistory } from './collections/ViewHistory'
import { ItemViews } from './collections/ItemViews'
import { SearchHistory } from './collections/SearchHistory'
import { MatchScoreConfig } from './globals/MatchScoreConfig'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [
    Users,
    Media,
    Categories,
    ShopItems,
    TradeProposals,
    ProposalVersions,
    ProposalMessages,
    Notifications,
    Reports,
    Disputes,
    ViewHistory,
    ItemViews,
    SearchHistory,
  ],
  globals: [MatchScoreConfig],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
  }),
  // Resend voor verificatie- en wachtwoord-reset-e-mails (zie Users.ts → auth.verify/
  // forgotPassword voor de e-mailinhoud zelf). RESEND_API_KEY moet lokaal (.env.local) en in
  // Vercel (productie) gezet worden door Ralph, zie technische-architectuur-schets.md →
  // "Frontend: Login & registratie". Standaard-afzender is Resend's eigen testadres
  // (onboarding@resend.dev), dat werkt zonder domeinverificatie maar levert alleen af bij het
  // e-mailadres van het Resend-account zelf. Zodra Ralph een eigen domein verifieert bij
  // Resend, RESEND_FROM_EMAIL zetten naar bv. noreply@swopla.nl om aan iedereen te kunnen
  // versturen.
  email: resendAdapter({
    apiKey: process.env.RESEND_API_KEY || '',
    defaultFromAddress: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
    defaultFromName: 'Swopla',
  }),
  sharp,
  plugins: [
    vercelBlobStorage({
      enabled: true,
      collections: {
        media: true,
      },
      // De Vercel Blob-store in dit project heet "SwoplaPublic", dus Vercel injecteert de
      // token als SWOPLAPUBLIC_READ_WRITE_TOKEN (niet de generieke BLOB_READ_WRITE_TOKEN --
      // die bestaat hier niet). BLOB_READ_WRITE_TOKEN blijft als eerste keuze staan voor het
      // geval de store ooit hernoemd/opnieuw gekoppeld wordt.
      token: process.env.BLOB_READ_WRITE_TOKEN || process.env.SWOPLAPUBLIC_READ_WRITE_TOKEN || '',
    }),
  ],
})
