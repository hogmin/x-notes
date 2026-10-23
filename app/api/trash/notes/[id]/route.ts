import { NextResponse } from 'next/server'
import { getUserFromSession } from '@/app/server/auth/getUserFromSession'
import { purgeNote, restoreNote } from '@/app/server/db/xnotes.repository'
import { handleNameConflictError } from '@/app/server/http/nameConflictResponse'

function trashResult(result: 'ok' | 'not_found' | 'forbidden') {
  if (result === 'not_found') return NextResponse.json({ ok: false, message: 'Не знайдено' }, { status: 404 })
  if (result === 'forbidden') return NextResponse.json({ ok: false, message: 'Доступ заборонено' }, { status: 403 })
  return NextResponse.json({ ok: true })
}

export async function PATCH(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getUserFromSession()
  if (!user) return NextResponse.json({ ok: false, message: 'Не авторизовано' }, { status: 401 })

  const { id } = await ctx.params
  try {
    return trashResult(await restoreNote(id, user.id))
  } catch (error) {
    return handleNameConflictError(error, 'note')
  }
}

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getUserFromSession()
  if (!user) return NextResponse.json({ ok: false, message: 'Не авторизовано' }, { status: 401 })

  const { id } = await ctx.params
  return trashResult(await purgeNote(id, user.id))
}
