import { NextResponse } from 'next/server'
import { getUserFromSession } from '@/app/server/auth/getUserFromSession'
import { SESSION_COOKIE } from '@/app/server/auth/session'
import { findUserByEmail, findUserById, softDeleteUserAccount, updateUserEmail } from '@/app/server/db/xnotes.repository'

export async function GET() {
  const sessionUser = await getUserFromSession()
  if (!sessionUser) return NextResponse.json({ ok: true, user: null })

  return NextResponse.json({ ok: true, user: sessionUser })
}

export async function PATCH(req: Request) {
  const sessionUser = await getUserFromSession()
  if (!sessionUser) return NextResponse.json({ ok: false, message: 'Не авторизовано' }, { status: 401 })

  const body = (await req.json()) as { email?: string }
  const email = (body.email ?? '').trim().toLowerCase()

  if (!email) return NextResponse.json({ ok: false, message: 'Email обовʼязковий' }, { status: 400 })

  const me = await findUserById(sessionUser.id, true)
  if (!me) return NextResponse.json({ ok: false, message: 'Користувача не знайдено' }, { status: 404 })

  const exists = await findUserByEmail(email, true)
  if (exists && exists.id !== me.id) {
    return NextResponse.json({ ok: false, message: 'Такий email вже використовується' }, { status: 409 })
  }

  const updated = await updateUserEmail(me.id, email)
  if (!updated) return NextResponse.json({ ok: false, message: 'Користувача не знайдено' }, { status: 404 })

  return NextResponse.json({
    ok: true,
    user: { id: String(updated.id), email: updated.email },
  })
}

export async function DELETE() {
  const sessionUser = await getUserFromSession()
  if (!sessionUser) return NextResponse.json({ ok: false, message: 'Не авторизовано' }, { status: 401 })

  const deleted = await softDeleteUserAccount(sessionUser.id)
  if (!deleted) return NextResponse.json({ ok: false, message: 'Користувача не знайдено' }, { status: 404 })

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
