import { cookies } from 'next/headers'
import { findUserBySessionTokenHash } from '@/app/server/db/xnotes.repository'
import { SESSION_COOKIE, hashToken } from './session'

export async function getUserFromSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  if (!token) return null

  const tokenHash = hashToken(token)
  const user = await findUserBySessionTokenHash(tokenHash)

  if (!user) return null

  return { id: String(user.id), email: user.email }
}
