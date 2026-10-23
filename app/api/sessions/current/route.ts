import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getUserFromSession } from '@/app/server/auth/getUserFromSession'
import { SESSION_COOKIE, hashToken } from '@/app/server/auth/session'
import { deleteSessionByTokenHash } from '@/app/server/db/xnotes.repository'

export async function GET() {
  const user = await getUserFromSession()
  return NextResponse.json({ ok: true, user: user ?? null })
}

export async function DELETE() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value

  if (token) {
    await deleteSessionByTokenHash(hashToken(token))
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set({
    name: SESSION_COOKIE,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: new Date(0),
  })

  return res
}
