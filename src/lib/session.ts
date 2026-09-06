import { cookies } from 'next/headers'
import type { Payload } from 'payload'
import { generatePayloadCookie } from 'payload'

/**
 * Zet Payload's eigen sessiecookie handmatig, het gedocumenteerde patroon voor een custom
 * Next.js-frontend bovenop Payload's Local API (die zelf geen Set-Cookie-header zet zoals de
 * REST-endpoints dat wel doen). Gebruikt door zowel /inloggen als /wachtwoord-resetten (na een
 * geslaagde reset log je automatisch in), zie technische-architectuur-schets.md -> "Frontend:
 * Login & registratie".
 */
export async function zetSessieCookie(payload: Payload, token: string) {
  const cookieStore = await cookies()
  const cookieData = generatePayloadCookie({
    collectionAuthConfig: payload.collections.users.config.auth,
    cookiePrefix: payload.config.cookiePrefix,
    returnCookieAsObject: true,
    token,
  })
  cookieStore.set(cookieData.name, cookieData.value ?? '', {
    domain: cookieData.domain,
    expires: cookieData.expires ? new Date(cookieData.expires) : undefined,
    httpOnly: cookieData.httpOnly,
    path: cookieData.path,
    sameSite: cookieData.sameSite
      ? (cookieData.sameSite.toLowerCase() as 'lax' | 'strict' | 'none')
      : undefined,
    secure: cookieData.secure,
  })
}

/** Wist de sessiecookie (zie /uitloggen). Stateless JWT, dus verwijderen is voldoende. */
export async function wisSessieCookie(payload: Payload) {
  const cookieStore = await cookies()
  cookieStore.delete(`${payload.config.cookiePrefix}-token`)
}
