import { NextResponse } from 'next/server'
import { getUserFromSession } from '@/app/server/auth/getUserFromSession'
import { listTrash } from '@/app/server/db/xnotes.repository'

export async function GET() {
  const user = await getUserFromSession()
  if (!user) return NextResponse.json({ ok: false, message: 'Не авторизовано' }, { status: 401 })

  const { workspaces, folders, notes } = await listTrash(user.id)

  return NextResponse.json({
    ok: true,
    items: {
      workspaces: workspaces.map((x) => ({
        id: String(x.id),
        title: x.title,
        ownerEmail: x.ownerEmail,
        deletedAt: x.deletedAt ? x.deletedAt.toISOString() : null,
      })),
      folders: folders.map((x) => ({
        id: String(x.id),
        title: x.title,
        workspaceTitle: x.workspaceTitle,
        ownerEmail: x.ownerEmail,
        deletedAt: x.deletedAt ? x.deletedAt.toISOString() : null,
      })),
      notes: notes.map((x) => ({
        id: String(x.id),
        title: x.title,
        workspaceTitle: x.workspaceTitle,
        folderTitle: x.folderTitle,
        ownerEmail: x.ownerEmail,
        deletedAt: x.deletedAt ? x.deletedAt.toISOString() : null,
      })),
    },
  })
}
