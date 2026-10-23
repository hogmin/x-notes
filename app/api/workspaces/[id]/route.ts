import { NextResponse } from 'next/server'
import { getUserFromSession } from '@/app/server/auth/getUserFromSession'
import {
  findActiveWorkspaceForOwner,
  softDeleteWorkspaceTree,
  updateWorkspaceTitle,
} from '@/app/server/db/xnotes.repository'
import { handleNameConflictError } from '@/app/server/http/nameConflictResponse'

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const user = await getUserFromSession()
  if (!user) return NextResponse.json({ ok: false, message: 'Не авторизовано' }, { status: 401 })

  const item = await findActiveWorkspaceForOwner(id, user.id)
  if (!item) {
    return NextResponse.json({ ok: false, message: 'Робочий простір не знайдено' }, { status: 404 })
  }

  return NextResponse.json({
    ok: true,
    item: {
      id: String(item.id),
      title: item.title,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    },
  })
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const user = await getUserFromSession()
  if (!user) return NextResponse.json({ ok: false, message: 'Не авторизовано' }, { status: 401 })

  const body = (await req.json()) as { title?: string }

  const title = (body.title ?? '').trim()
  if (!title) return NextResponse.json({ ok: false, message: 'Некоректні дані' }, { status: 400 })

  let item: Awaited<ReturnType<typeof updateWorkspaceTitle>>
  try {
    item = await updateWorkspaceTitle(id, title, user.id)
  } catch (error) {
    return handleNameConflictError(error, 'workspace')
  }

  if (!item) return NextResponse.json({ ok: false, message: 'Робочий простір не знайдено' }, { status: 404 })

  return NextResponse.json({
    ok: true,
    item: {
      id: String(item.id),
      title: item.title,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    },
  })
}

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const user = await getUserFromSession()
  if (!user) return NextResponse.json({ ok: false, message: 'Не авторизовано' }, { status: 401 })

  const ok = await softDeleteWorkspaceTree(id, user.id)
  if (!ok) return NextResponse.json({ ok: false, message: 'Робочий простір не знайдено' }, { status: 404 })

  return NextResponse.json({ ok: true })
}
