import { NextResponse } from 'next/server'
import { getUserFromSession } from '@/app/server/auth/getUserFromSession'
import { createWorkspace, listWorkspacesByOwner } from '@/app/server/db/xnotes.repository'
import { handleNameConflictError } from '@/app/server/http/nameConflictResponse'

export async function GET() {
  const user = await getUserFromSession()
  if (!user) return NextResponse.json({ ok: false, message: 'Не авторизовано' }, { status: 401 })

  const items = await listWorkspacesByOwner(user.id)

  return NextResponse.json({
    ok: true,
    items: items.map((w) => ({ id: String(w.id), title: w.title, createdAt: w.createdAt, updatedAt: w.updatedAt })),
  })
}

export async function POST(req: Request) {
  const user = await getUserFromSession()
  if (!user) return NextResponse.json({ ok: false, message: 'Не авторизовано' }, { status: 401 })

  const body = (await req.json()) as { title?: string }

  const title = (body.title ?? '').trim()

  if (!title) {
    return NextResponse.json({ ok: false, message: 'Некоректні дані' }, { status: 400 })
  }

  try {
    const ws = await createWorkspace(user.id, title)
    return NextResponse.json({
      ok: true,
      item: { id: String(ws.id), title: ws.title, createdAt: ws.createdAt, updatedAt: ws.updatedAt },
    }, { status: 201 })
  } catch (error) {
    return handleNameConflictError(error, 'workspace')
  }
}
