import crypto from 'crypto'

export const SESSION_COOKIE = 'xnotes_session'

export function newToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export function expiresInDays(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d
}
