import { createAsyncThunk, createSlice, isAnyOf } from '@reduxjs/toolkit'

export type TrashWorkspace = { id: string; title: string; ownerEmail: string; deletedAt: string | null }
export type TrashFolder = {
  id: string
  title: string
  workspaceTitle: string
  ownerEmail: string
  deletedAt: string | null
}
export type TrashNote = {
  id: string
  title: string
  workspaceTitle: string
  folderTitle: string | null
  ownerEmail: string
  deletedAt: string | null
}

type TrashState = {
  workspaces: TrashWorkspace[]
  folders: TrashFolder[]
  notes: TrashNote[]
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
}

type TrashPayload = { workspaces: TrashWorkspace[]; folders: TrashFolder[]; notes: TrashNote[] }
type TrashResponse = { ok: true; items: TrashPayload } | { ok: false; message?: string }
type BasicResponse = { ok: true } | { ok: false; message?: string }

const initialState: TrashState = {
  workspaces: [],
  folders: [],
  notes: [],
  status: 'idle',
  error: null,
}

export const fetchTrash = createAsyncThunk<
  TrashPayload,
  void,
  { rejectValue: string }
>('trash/fetch', async (_, thunkApi) => {
  try {
    const res = await fetch('/api/trash')
    const data = (await res.json()) as TrashResponse
    if (!res.ok || !data.ok) {
      return thunkApi.rejectWithValue(data.ok ? 'Помилка завантаження' : data.message ?? 'Помилка завантаження')
    }
    return data.items
  } catch {
    return thunkApi.rejectWithValue('Не вдалося підключитися до сервера')
  }
})

export const restoreWorkspace = createAsyncThunk<string, { id: string }, { rejectValue: string }>(
  'trash/restore/workspace',
  async ({ id }, thunkApi) => {
    try {
      const res = await fetch(`/api/trash/workspaces/${encodeURIComponent(id)}`, { method: 'PATCH' })
      const data = (await res.json()) as BasicResponse
      if (!res.ok || !data.ok) {
        return thunkApi.rejectWithValue(data.ok ? 'Помилка відновлення' : data.message ?? 'Помилка відновлення')
      }
      return id
    } catch {
      return thunkApi.rejectWithValue('Не вдалося підключитися до сервера')
    }
  }
)

export const purgeWorkspace = createAsyncThunk<string, { id: string }, { rejectValue: string }>(
  'trash/purge/workspace',
  async ({ id }, thunkApi) => {
    try {
      const res = await fetch(`/api/trash/workspaces/${encodeURIComponent(id)}`, { method: 'DELETE' })
      const data = (await res.json()) as BasicResponse
      if (!res.ok || !data.ok) {
        return thunkApi.rejectWithValue(data.ok ? 'Помилка видалення' : data.message ?? 'Помилка видалення')
      }
      return id
    } catch {
      return thunkApi.rejectWithValue('Не вдалося підключитися до сервера')
    }
  }
)

export const restoreFolder = createAsyncThunk<string, { id: string }, { rejectValue: string }>(
  'trash/restoreFolder',
  async ({ id }, thunkApi) => {
    try {
      const res = await fetch(`/api/trash/folders/${encodeURIComponent(id)}`, { method: 'PATCH' })
      const data = (await res.json()) as BasicResponse
      if (!res.ok || !data.ok) {
        return thunkApi.rejectWithValue(data.ok ? 'Помилка відновлення' : data.message ?? 'Помилка відновлення')
      }
      return id
    } catch {
      return thunkApi.rejectWithValue('Не вдалося підключитися до сервера')
    }
  }
)

export const purgeFolder = createAsyncThunk<string, { id: string }, { rejectValue: string }>(
  'trash/purge/folder',
  async ({ id }, thunkApi) => {
    try {
      const res = await fetch(`/api/trash/folders/${encodeURIComponent(id)}`, { method: 'DELETE' })
      const data = (await res.json()) as BasicResponse
      if (!res.ok || !data.ok) {
        return thunkApi.rejectWithValue(data.ok ? 'Помилка видалення' : data.message ?? 'Помилка видалення')
      }
      return id
    } catch {
      return thunkApi.rejectWithValue('Не вдалося підключитися до сервера')
    }
  }
)

export const restoreNote = createAsyncThunk<string, { id: string }, { rejectValue: string }>(
  'trash/restoreNote',
  async ({ id }, thunkApi) => {
    try {
      const res = await fetch(`/api/trash/notes/${encodeURIComponent(id)}`, { method: 'PATCH' })
      const data = (await res.json()) as BasicResponse
      if (!res.ok || !data.ok) {
        return thunkApi.rejectWithValue(data.ok ? 'Помилка відновлення' : data.message ?? 'Помилка відновлення')
      }
      return id
    } catch {
      return thunkApi.rejectWithValue('Не вдалося підключитися до сервера')
    }
  }
)

export const purgeNote = createAsyncThunk<string, { id: string }, { rejectValue: string }>(
  'trash/purge/note',
  async ({ id }, thunkApi) => {
    try {
      const res = await fetch(`/api/trash/notes/${encodeURIComponent(id)}`, { method: 'DELETE' })
      const data = (await res.json()) as BasicResponse
      if (!res.ok || !data.ok) {
        return thunkApi.rejectWithValue(data.ok ? 'Помилка видалення' : data.message ?? 'Помилка видалення')
      }
      return id
    } catch {
      return thunkApi.rejectWithValue('Не вдалося підключитися до сервера')
    }
  }
)

const slice = createSlice({
  name: 'trash',
  initialState,
  reducers: {
    clearTrashError(s) {
      s.error = null
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchTrash.pending, (s) => {
      s.status = 'loading'
      s.error = null
    })
    b.addCase(fetchTrash.fulfilled, (s, a) => {
      s.status = 'succeeded'
      s.workspaces = a.payload.workspaces
      s.folders = a.payload.folders
      s.notes = a.payload.notes
    })
    b.addCase(fetchTrash.rejected, (s, a) => {
      s.status = 'failed'
      s.error = a.payload ?? 'Помилка'
    })

    b.addMatcher(
      isAnyOf(restoreWorkspace.fulfilled, purgeWorkspace.fulfilled),
      (s, a) => {
        s.workspaces = s.workspaces.filter((x) => x.id !== a.payload)
      }
    )
    b.addMatcher(
      isAnyOf(restoreFolder.fulfilled, purgeFolder.fulfilled),
      (s, a) => {
        s.folders = s.folders.filter((x) => x.id !== a.payload)
      }
    )
    b.addMatcher(
      isAnyOf(restoreNote.fulfilled, purgeNote.fulfilled),
      (s, a) => {
        s.notes = s.notes.filter((x) => x.id !== a.payload)
      }
    )
    b.addMatcher(
      isAnyOf(
        restoreWorkspace.pending,
        purgeWorkspace.pending,
        restoreFolder.pending,
        purgeFolder.pending,
        restoreNote.pending,
        purgeNote.pending
      ),
      (s) => {
        s.error = null
      }
    )
    b.addMatcher(
      isAnyOf(
        restoreWorkspace.rejected,
        purgeWorkspace.rejected,
        restoreFolder.rejected,
        purgeFolder.rejected,
        restoreNote.rejected,
        purgeNote.rejected
      ),
      (s, a) => {
        s.error = a.payload ?? 'Помилка'
      }
    )
  },
})

export const { clearTrashError } = slice.actions
export const trashReducer = slice.reducer
