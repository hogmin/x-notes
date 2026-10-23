import { NextResponse } from 'next/server'
import { verifyPassword } from '@/app/server/auth/password'
import { SESSION_COOKIE, expiresInDays, hashToken, newToken } from '@/app/server/auth/session'
import { createSession, findUserByEmail } from '@/app/server/db/xnotes.repository'

type CreateSessionBody = {
  email?: string
  password?: string
}

export async function POST(req: Request) {
  const body = (await req.json()) as CreateSessionBody
  const email = (body.email ?? '').trim().toLowerCase()
  const password = body.password ?? ''

  if (!email || !password) {
    return NextResponse.json({ ok: false, message: 'Некоректні дані' }, { status: 400 })
  }

  const user = await findUserByEmail(email, true)
  if (!user) {
    return NextResponse.json({ ok: false, message: 'Невірний email або пароль' }, { status: 401 })
  }

  const validPassword = await verifyPassword(password, user.passwordHash)
  if (!validPassword) {
    return NextResponse.json({ ok: false, message: 'Невірний email або пароль' }, { status: 401 })
  }

  const token = newToken()
  const expiresAt = expiresInDays(14)

  await createSession({
    userId: user.id,
    tokenHash: hashToken(token),
    expiresAt,
  })

  const res = NextResponse.json(
    { ok: true, user: { id: String(user.id), email: user.email } },
    { status: 201 }
  )
  res.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  })

  return res
}
