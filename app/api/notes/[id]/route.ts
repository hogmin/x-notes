import { NextResponse } from 'next/server'
import { getUserFromSession } from '@/app/server/auth/getUserFromSession'
import {
  findActiveFolderDetail,
  findActiveNoteDetail,
  softDeleteNote,
  updateNote,
} from '@/app/server/db/xnotes.repository'
import { handleNameConflictError } from '@/app/server/http/nameConflictResponse'

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const user = await getUserFromSession()
  if (!user) return NextResponse.json({ ok: false, message: 'Не авторизовано' }, { status: 401 })

  const note = await findActiveNoteDetail(id, user.id)
  if (!note) return NextResponse.json({ ok: false, message: 'Note не знайдено' }, { status: 404 })

  return NextResponse.json({
    ok: true,
    item: {
      id: String(note.id),
      title: note.title,
      ownerId: String(note.ownerId),
      workspaceId: String(note.workspaceId),
      workspaceTitle: note.workspaceTitle,
      folderId: note.folderId === null ? null : String(note.folderId),
      folderTitle: note.folderTitle,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    },
  })
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const user = await getUserFromSession()
  if (!user) return NextResponse.json({ ok: false, message: 'Не авторизовано' }, { status: 401 })

  const body = (await req.json()) as { title?: string; folderId?: string | null }

  const existing = await findActiveNoteDetail(id, user.id)
  if (!existing) return NextResponse.json({ ok: false, message: 'Note не знайдено' }, { status: 404 })

  let title: string | undefined
  let folderId: string | null | undefined

  if (typeof body.title === 'string') {
    title = body.title.trim()
    if (!title) return NextResponse.json({ ok: false, message: 'Некоректна назва' }, { status: 400 })
  }

  if (body.folderId !== undefined) {
    if (body.folderId === null) {
      folderId = null
    } else {
      const folder = await findActiveFolderDetail(body.folderId, user.id)
      if (!folder) return NextResponse.json({ ok: false, message: 'Folder не знайдено' }, { status: 404 })
      if (folder.workspaceId !== existing.workspaceId) {
        return NextResponse.json({ ok: false, message: 'Folder належить іншому workspace' }, { status: 400 })
      }
      folderId = body.folderId
    }
  }

  let note: Awaited<ReturnType<typeof updateNote>>
  try {
    note = await updateNote({ id, title, folderId })
  } catch (error) {
    return handleNameConflictError(error, 'note')
  }
  if (!note) return NextResponse.json({ ok: false, message: 'Note не знайдено' }, { status: 404 })

  return NextResponse.json({
    ok: true,
    item: {
      id: String(note.id),
      title: note.title,
      folderId: note.folderId === null ? null : String(note.folderId),
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    },
  })
}

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const user = await getUserFromSession()
  if (!user) return NextResponse.json({ ok: false, message: 'Не авторизовано' }, { status: 401 })

  const note = await findActiveNoteDetail(id, user.id)
  if (!note) return NextResponse.json({ ok: false, message: 'Note не знайдено' }, { status: 404 })

  await softDeleteNote(id)

  return NextResponse.json({ ok: true })
}
