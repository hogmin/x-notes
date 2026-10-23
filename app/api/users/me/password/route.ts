import { NextResponse } from 'next/server'
import { getUserFromSession } from '@/app/server/auth/getUserFromSession'
import { hashPassword, verifyPassword } from '@/app/server/auth/password'
import { findUserById, updateUserPasswordHash } from '@/app/server/db/xnotes.repository'

type UpdatePasswordBody = {
  currentPassword?: string
  newPassword?: string
}

export async function PATCH(req: Request) {
  const sessionUser = await getUserFromSession()
  if (!sessionUser) return NextResponse.json({ ok: false, message: 'Не авторизовано' }, { status: 401 })

  const body = (await req.json()) as UpdatePasswordBody
  const currentPassword = (body.currentPassword ?? '').trim()
  const newPassword = (body.newPassword ?? '').trim()

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ ok: false, message: 'Заповни всі поля' }, { status: 400 })
  }
  if (newPassword.length < 6) {
    return NextResponse.json({ ok: false, message: 'Пароль має бути не менше 6 символів' }, { status: 400 })
  }

  const user = await findUserById(sessionUser.id, true)
  if (!user) return NextResponse.json({ ok: false, message: 'Користувача не знайдено' }, { status: 404 })

  const validPassword = await verifyPassword(currentPassword, user.passwordHash)
  if (!validPassword) {
    return NextResponse.json({ ok: false, message: 'Поточний пароль невірний' }, { status: 400 })
  }

  await updateUserPasswordHash(sessionUser.id, await hashPassword(newPassword))

  return NextResponse.json({ ok: true })
}
