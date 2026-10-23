import { NextResponse } from 'next/server'
import { getUserFromSession } from '@/app/server/auth/getUserFromSession'
import { purgeWorkspaceTree, restoreWorkspaceTree } from '@/app/server/db/xnotes.repository'
import { handleNameConflictError } from '@/app/server/http/nameConflictResponse'

export async function PATCH(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getUserFromSession()
  if (!user) return NextResponse.json({ ok: false, message: 'Не авторизовано' }, { status: 401 })

  const { id } = await ctx.params
  let restored: Awaited<ReturnType<typeof restoreWorkspaceTree>>
  try {
    restored = await restoreWorkspaceTree(id, user.id)
  } catch (error) {
    return handleNameConflictError(error, 'workspace')
  }
  if (!restored) return NextResponse.json({ ok: false, message: 'Не знайдено' }, { status: 404 })

  return NextResponse.json({ ok: true })
}

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getUserFromSession()
  if (!user) return NextResponse.json({ ok: false, message: 'Не авторизовано' }, { status: 401 })

  const { id } = await ctx.params
  const purged = await purgeWorkspaceTree(id, user.id)
  if (!purged) return NextResponse.json({ ok: false, message: 'Не знайдено' }, { status: 404 })

  return NextResponse.json({ ok: true })
}
