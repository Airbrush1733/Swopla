'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'

import { VIEWER_COOKIE } from '@/lib/viewer'

/**
 * Zet of wist de "bekijk als testgebruiker"-cookie (zie src/lib/viewer.ts voor de
 * achtergrond). Server action achter het select-menu in de Nav — werkt zonder client-JS.
 */
export async function zetTestgebruiker(formData: FormData) {
  const waarde = formData.get('viewerId')
  const cookieStore = await cookies()

  if (!waarde || waarde === '') {
    cookieStore.delete(VIEWER_COOKIE)
  } else {
    cookieStore.set(VIEWER_COOKIE, String(waarde), {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    })
  }

  revalidatePath('/', 'layout')
}
