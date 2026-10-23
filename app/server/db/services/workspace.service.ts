import { EntityManager } from '@mikro-orm/core'
import { Workspace } from '../entities/Workspace.entity'
import { Folder } from '../entities/Folder.entity'
import { Note } from '../entities/Note.entity'

type IdInput = number | string

const toId = (id: IdInput) => (typeof id === 'number' ? id : Number(id))

export async function softDeleteWorkspace(em: EntityManager, workspaceId: IdInput) {
  return em.transactional(async (tx) => {
    const ws = await tx.findOne(Workspace, { id: toId(workspaceId), deletedAt: null })
    if (!ws) return { ok: false as const }

    const now = new Date()

    ws.deletedAt = now
    await tx.persist(ws)

    await tx.nativeUpdate(Folder, { workspaceId: ws, deletedAt: null }, { deletedAt: now })
    await tx.nativeUpdate(Note, { workspaceId: ws, deletedAt: null }, { deletedAt: now })

    return { ok: true as const }
  })
}

export async function restoreWorkspace(em: EntityManager, workspaceId: IdInput) {
  return em.transactional(async (tx) => {
    const ws = await tx.findOne(Workspace, { id: toId(workspaceId), deletedAt: { $ne: null } })
    if (!ws) return { ok: false as const }

    ws.deletedAt = null
    await tx.persist(ws)

    await tx.nativeUpdate(Folder, { workspaceId: ws }, { deletedAt: null })
    await tx.nativeUpdate(Note, { workspaceId: ws }, { deletedAt: null })

    return { ok: true as const }
  })
}

export async function purgeWorkspace(em: EntityManager, workspaceId: IdInput) {
  return em.transactional(async (tx) => {
    const ws = await tx.findOne(Workspace, { id: toId(workspaceId) })
    if (!ws) return { ok: false as const }

    await tx.nativeDelete(Note, { workspaceId: ws })
    await tx.nativeDelete(Folder, { workspaceId: ws })
    await tx.nativeDelete(Workspace, { id: toId(workspaceId) })

    return { ok: true as const }
  })
}
