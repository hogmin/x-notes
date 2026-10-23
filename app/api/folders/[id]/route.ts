import { NextResponse } from 'next/server'
import { getUserFromSession } from '@/app/server/auth/getUserFromSession'
import {
  findActiveFolderDetail,
  listNotes,
  softDeleteFolder,
  updateFolderTitle,
} from '@/app/server/db/xnotes.repository'
import { handleNameConflictError } from '@/app/server/http/nameConflictResponse'

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const user = await getUserFromSession()
  if (!user) return NextResponse.json({ ok: false, message: 'Не авторизовано' }, { status: 401 })

  const folder = await findActiveFolderDetail(id, user.id)
  if (!folder) return NextResponse.json({ ok: false, message: 'Folder не знайдено' }, { status: 404 })

  const notes = await listNotes({ ownerId: user.id, workspaceId: folder.workspaceId, folderId: folder.id })

  return NextResponse.json({
    ok: true,
    item: {
      id: String(folder.id),
      title: folder.title,
      workspaceId: String(folder.workspaceId),
      workspaceTitle: folder.workspaceTitle,
      createdAt: folder.createdAt,
      updatedAt: folder.updatedAt,
      notes: notes.map((n) => ({
        id: String(n.id),
        title: n.title,
        ownerId: String(n.ownerId),
        workspaceId: String(n.workspaceId),
        folderId: n.folderId === null ? null : String(n.folderId),
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
      })),
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

  const existing = await findActiveFolderDetail(id, user.id)
  if (!existing) return NextResponse.json({ ok: false, message: 'Folder не знайдено' }, { status: 404 })

  let folder: Awaited<ReturnType<typeof updateFolderTitle>>
  try {
    folder = await updateFolderTitle(id, title)
  } catch (error) {
    return handleNameConflictError(error, 'folder')
  }
  if (!folder) return NextResponse.json({ ok: false, message: 'Folder не знайдено' }, { status: 404 })

  return NextResponse.json({
    ok: true,
    item: {
      id: String(folder.id),
      title: folder.title,
      workspaceId: String(folder.workspaceId),
      createdAt: folder.createdAt,
      updatedAt: folder.updatedAt,
    },
  })
}

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const user = await getUserFromSession()
  if (!user) return NextResponse.json({ ok: false, message: 'Не авторизовано' }, { status: 401 })

  const folder = await findActiveFolderDetail(id, user.id)
  if (!folder) return NextResponse.json({ ok: false, message: 'Folder не знайдено' }, { status: 404 })

  await softDeleteFolder(id)

  return NextResponse.json({ ok: true })
}
