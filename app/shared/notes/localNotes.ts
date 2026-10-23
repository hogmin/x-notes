export type LocalNote = {
  noteId: string
  userId: string
  workspaceId: string
  folderId: string | null
  content: string
  updatedAt: string
}

const key = (userId: string, noteId: string) => `note_v1_${userId}_${noteId}`

export function getLocalNoteContent(userId: string, noteId: string): string {
  const raw = window.localStorage.getItem(key(userId, noteId))
  if (!raw) return ''
  try {
    const parsed = JSON.parse(raw) as LocalNote
    return parsed?.content ?? ''
  } catch {
    return ''
  }
}

export function upsertLocalNote(note: LocalNote) {
  window.localStorage.setItem(key(note.userId, note.noteId), JSON.stringify(note))
}

export function deleteLocalNote(userId: string, noteId: string) {
  window.localStorage.removeItem(key(userId, noteId))
}
