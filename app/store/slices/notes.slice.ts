import { createAsyncThunk, createSlice, isAnyOf } from '@reduxjs/toolkit'
import type { RootState } from '@/app/store/store'
import { deleteLocalNote, upsertLocalNote } from '@/app/shared/notes/localNotes'
import { deleteFolder } from './folders.slice'

export type NoteDto = {
  id: string
  title: string
  ownerId: string
  workspaceId: string
  folderId: string | null
  createdAt: string
  updatedAt: string
  deletedAt: Date
}

type State = {
  byWorkspace: Record<string, NoteDto[]>
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
}

type NoteListResponse = { ok: true; items: NoteDto[] } | { ok: false; message?: string }
type NoteResponse = { ok: true; item: NoteDto } | { ok: false; message?: string }
type NotePatchResponse =
  | { ok: true; item: { title: string; folderId: string | null; updatedAt?: string } }
  | { ok: false; message?: string }
type BasicResponse = { ok: true } | { ok: false; message?: string }

const initialState: State = {
  byWorkspace: {},
  status: 'idle',
  error: null,
}

export const fetchNotes = createAsyncThunk<
  { workspaceId: string; items: NoteDto[] },
  { workspaceId: string; folderId?: string | null },
  { state: RootState; rejectValue: string }
>('notes/fetch', async ({ workspaceId, folderId }, thunkApi) => {
  const ownerId = thunkApi.getState().auth.user?.id
  if (!ownerId) return thunkApi.rejectWithValue('Не авторизовано')

  const qs = new URLSearchParams()
  if (folderId !== undefined) qs.set('folderId', folderId === null ? 'null' : folderId)

  try {
    const query = qs.toString()
    const res = await fetch(`/api/workspaces/${encodeURIComponent(workspaceId)}/notes${query ? `?${query}` : ''}`)
    const data = (await res.json()) as NoteListResponse
    if (!res.ok) return thunkApi.rejectWithValue(data.ok ? 'Помилка завантаження' : data.message ?? 'Помилка завантаження')
    if (!data.ok) return thunkApi.rejectWithValue(data.message ?? 'Помилка завантаження')
    return { workspaceId, items: data.items }
  } catch {
    return thunkApi.rejectWithValue('Не вдалося підключитися до сервера')
  }
})

export const createNote = createAsyncThunk<
  NoteDto,
  { workspaceId: string; folderId: string | null; title: string; content: string },
  { state: RootState; rejectValue: string }
>('notes/create', async ({ workspaceId, folderId, title, content }, thunkApi) => {
  const ownerId = thunkApi.getState().auth.user?.id
  if (!ownerId) return thunkApi.rejectWithValue('Не авторизовано')

  try {
    const res = await fetch(`/api/workspaces/${encodeURIComponent(workspaceId)}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderId, title }),
    })
    const data = (await res.json()) as NoteResponse
    if (!res.ok) return thunkApi.rejectWithValue(data.ok ? 'Помилка створення' : data.message ?? 'Помилка створення')
    if (!data.ok) return thunkApi.rejectWithValue(data.message ?? 'Помилка створення')

    const note = data.item

    if (typeof window !== 'undefined') {
      upsertLocalNote({
        noteId: note.id,
        userId: ownerId,
        workspaceId,
        folderId,
        content,
        updatedAt: new Date().toISOString(),
      })
    }

    return note
  } catch {
    return thunkApi.rejectWithValue('Не вдалося підключитися до сервера')
  }
})

export const moveNote = createAsyncThunk<
  { id: string; workspaceId: string; folderId: string | null },
  { id: string; workspaceId: string; folderId: string | null },
  { rejectValue: string }
>('notes/move', async ({ id, workspaceId, folderId }, thunkApi) => {
  try {
    const res = await fetch(`/api/notes/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderId }),
    })
    const data = (await res.json()) as NotePatchResponse
    if (!res.ok) return thunkApi.rejectWithValue(data.ok ? 'Помилка переміщення' : data.message ?? 'Помилка переміщення')
    if (!data.ok) return thunkApi.rejectWithValue(data.message ?? 'Помилка переміщення')
    return { id, workspaceId, folderId: data.item.folderId ?? null }
  } catch {
    return thunkApi.rejectWithValue('Не вдалося підключитися до сервера')
  }
})

export const updateNoteTitle = createAsyncThunk<
  { id: string; title: string; folderId: string | null; workspaceId: string },
  { id: string; workspaceId: string; title: string },
  { rejectValue: string }
>('notes/updateTitle', async ({ id, workspaceId, title }, thunkApi) => {
  try {
    const res = await fetch(`/api/notes/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
    const data = (await res.json()) as NotePatchResponse
    if (!res.ok) return thunkApi.rejectWithValue(data.ok ? 'Помилка оновлення' : data.message ?? 'Помилка оновлення')
    if (!data.ok) return thunkApi.rejectWithValue(data.message ?? 'Помилка оновлення')
    return { id, title: data.item.title, folderId: data.item.folderId ?? null, workspaceId }
  } catch {
    return thunkApi.rejectWithValue('Не вдалося підключитися до сервера')
  }
})

export const deleteNote = createAsyncThunk<
  { id: string; workspaceId: string; ownerId: string },
  { id: string; workspaceId: string },
  { state: RootState; rejectValue: string }
>('notes/delete', async ({ id, workspaceId }, thunkApi) => {
  const ownerId = thunkApi.getState().auth.user?.id
  if (!ownerId) return thunkApi.rejectWithValue('Не авторизовано')

  try {
    const res = await fetch(`/api/notes/${encodeURIComponent(id)}`, { method: 'DELETE' })
    const data = (await res.json()) as BasicResponse
    if (!res.ok) return thunkApi.rejectWithValue(data.ok ? 'Помилка видалення' : data.message ?? 'Помилка видалення')
    if (!data.ok) return thunkApi.rejectWithValue(data.message ?? 'Помилка видалення')

    if (typeof window !== 'undefined') deleteLocalNote(ownerId, id)

    return { id, workspaceId, ownerId }
  } catch {
    return thunkApi.rejectWithValue('Не вдалося підключитися до сервера')
  }
})

const slice = createSlice({
  name: 'notes',
  initialState,
  reducers: {
    clearNotesError(s) {
      s.error = null
    },
  },
  extraReducers: (b) => {
    b.addCase(moveNote.fulfilled, (s, a) => {
    const wsId = a.payload.workspaceId
    s.byWorkspace[wsId] = (s.byWorkspace[wsId] ?? []).map((x) =>
        x.id === a.payload.id ? { ...x, folderId: a.payload.folderId } : x
    )
    })

    b.addCase(fetchNotes.pending, (s) => {
      s.status = 'loading'
      s.error = null
    })
    b.addCase(fetchNotes.fulfilled, (s, a) => {
      s.status = 'succeeded'
      s.byWorkspace[a.payload.workspaceId] = a.payload.items
    })
    b.addCase(fetchNotes.rejected, (s, a) => {
      s.status = 'failed'
      s.error = a.payload ?? 'Помилка'
    })

    b.addCase(createNote.fulfilled, (s, a) => {
      const wsId = a.payload.workspaceId
      s.byWorkspace[wsId] = [a.payload, ...(s.byWorkspace[wsId] ?? [])]
    })

    b.addCase(updateNoteTitle.fulfilled, (s, a) => {
      s.byWorkspace[a.payload.workspaceId] = (s.byWorkspace[a.payload.workspaceId] ?? []).map((x) =>
        x.id === a.payload.id ? { ...x, title: a.payload.title, folderId: a.payload.folderId } : x
      )
    })

    b.addCase(deleteNote.fulfilled, (s, a) => {
      const { id, workspaceId } = a.payload
      s.byWorkspace[workspaceId] = (s.byWorkspace[workspaceId] ?? []).filter((x) => x.id !== id)
    })

    b.addCase(deleteFolder.fulfilled, (s, a) => {
      const { id, workspaceId } = a.payload
      s.byWorkspace[workspaceId] = (s.byWorkspace[workspaceId] ?? []).filter((x) => x.folderId !== id)
    })

    b.addMatcher(
      isAnyOf(createNote.pending, moveNote.pending, updateNoteTitle.pending, deleteNote.pending),
      (s) => {
        s.error = null
      }
    )
    b.addMatcher(
      isAnyOf(createNote.rejected, moveNote.rejected, updateNoteTitle.rejected, deleteNote.rejected),
      (s, a) => {
        s.error = a.payload ?? 'Помилка'
      }
    )
  },
})

export const { clearNotesError } = slice.actions
export const notesReducer = slice.reducer

export const selectNotesByWorkspace = (state: RootState, workspaceId: string) =>
  state.notes.byWorkspace[workspaceId] ?? []
