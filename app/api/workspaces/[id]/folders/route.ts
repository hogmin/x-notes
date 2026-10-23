import { NextResponse } from 'next/server'
import { getUserFromSession } from '@/app/server/auth/getUserFromSession'
import {
  createFolder,
  findActiveWorkspaceForOwner,
  listFoldersByWorkspace,
} from '@/app/server/db/xnotes.repository'
import { handleNameConflictError } from '@/app/server/http/nameConflictResponse'

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const user = await getUserFromSession()
  if (!user) return NextResponse.json({ ok: false, message: 'Не авторизовано' }, { status: 401 })

  const workspace = await findActiveWorkspaceForOwner(id, user.id)
  if (!workspace) return NextResponse.json({ ok: false, message: 'Workspace не знайдено' }, { status: 404 })

  const items = await listFoldersByWorkspace(id)

  return NextResponse.json({
    ok: true,
    items: items.map((f) => ({
      id: String(f.id),
      title: f.title,
      workspaceId: String(f.workspaceId),
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
    })),
  })
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const user = await getUserFromSession()
  if (!user) return NextResponse.json({ ok: false, message: 'Не авторизовано' }, { status: 401 })

  const workspace = await findActiveWorkspaceForOwner(id, user.id)
  if (!workspace) return NextResponse.json({ ok: false, message: 'Workspace не знайдено' }, { status: 404 })

  const body = (await req.json()) as { title?: string }
  const title = (body.title ?? '').trim()
  if (!title) return NextResponse.json({ ok: false, message: 'Некоректні дані' }, { status: 400 })

  let folder: Awaited<ReturnType<typeof createFolder>>
  try {
    folder = await createFolder(id, title)
  } catch (error) {
    return handleNameConflictError(error, 'folder')
  }

  return NextResponse.json(
    {
      ok: true,
      item: {
        id: String(folder.id),
        title: folder.title,
        workspaceId: String(folder.workspaceId),
        createdAt: folder.createdAt,
        updatedAt: folder.updatedAt,
      },
    },
    { status: 201 }
  )
}
