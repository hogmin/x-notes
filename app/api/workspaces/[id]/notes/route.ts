import { NextResponse } from 'next/server'
import { getUserFromSession } from '@/app/server/auth/getUserFromSession'
import {
  createNote,
  findActiveFolder,
  findActiveWorkspaceForOwner,
  listNotes,
} from '@/app/server/db/xnotes.repository'
import { handleNameConflictError } from '@/app/server/http/nameConflictResponse'

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const user = await getUserFromSession()
  if (!user) return NextResponse.json({ ok: false, message: 'Не авторизовано' }, { status: 401 })

  const workspace = await findActiveWorkspaceForOwner(id, user.id)
  if (!workspace) return NextResponse.json({ ok: false, message: 'Workspace не знайдено' }, { status: 404 })

  const { searchParams } = new URL(req.url)
  const folderId = searchParams.get('folderId')

  const items = await listNotes({
    ownerId: user.id,
    workspaceId: id,
    folderId: folderId === 'null' ? null : folderId ?? undefined,
  })

  return NextResponse.json({
    ok: true,
    items: items.map((n) => ({
      id: String(n.id),
      title: n.title,
      ownerId: String(n.ownerId),
      workspaceId: String(n.workspaceId),
      folderId: n.folderId === null ? null : String(n.folderId),
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
    })),
  })
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const user = await getUserFromSession()
  if (!user) return NextResponse.json({ ok: false, message: 'Не авторизовано' }, { status: 401 })

  const workspace = await findActiveWorkspaceForOwner(id, user.id)
  if (!workspace) return NextResponse.json({ ok: false, message: 'Workspace не знайдено' }, { status: 404 })

  const body = (await req.json()) as { folderId?: string | null; title?: string }
  const title = (body.title ?? '').trim()
  const folderId = body.folderId ?? null

  if (!title) {
    return NextResponse.json({ ok: false, message: 'Некоректні дані' }, { status: 400 })
  }

  if (folderId) {
    const folder = await findActiveFolder(folderId)
    if (!folder || folder.workspaceId !== workspace.id) {
      return NextResponse.json({ ok: false, message: 'Folder не знайдено' }, { status: 404 })
    }
  }

  let note: Awaited<ReturnType<typeof createNote>>
  try {
    note = await createNote({ ownerId: user.id, workspaceId: id, folderId, title })
  } catch (error) {
    return handleNameConflictError(error, 'note')
  }

  return NextResponse.json(
    {
      ok: true,
      item: {
        id: String(note.id),
        title: note.title,
        ownerId: String(note.ownerId),
        workspaceId: String(note.workspaceId),
        folderId: note.folderId === null ? null : String(note.folderId),
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
      },
    },
    { status: 201 }
  )
}
