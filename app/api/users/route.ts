import { NextResponse } from 'next/server'
import { createUserWithSession, findUserByEmail } from '@/app/server/db/xnotes.repository'
import { hashPassword } from '@/app/server/auth/password'
import { SESSION_COOKIE, expiresInDays, hashToken, newToken } from '@/app/server/auth/session'

type CreateUserBody = {
  email?: string
  password?: string
}

export async function POST(req: Request) {
  const body = (await req.json()) as CreateUserBody
  const email = (body.email ?? '').trim().toLowerCase()
  const password = body.password ?? ''

  if (!email || !password || password.length < 8) {
    return NextResponse.json({ ok: false, message: 'Некоректні дані' }, { status: 400 })
  }

  const exists = await findUserByEmail(email)
  if (exists) {
    return NextResponse.json({ ok: false, message: 'Email вже використовується' }, { status: 409 })
  }

  const token = newToken()
  const expiresAt = expiresInDays(14)
  const user = await createUserWithSession({
    email,
    passwordHash: await hashPassword(password),
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
