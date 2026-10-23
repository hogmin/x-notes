import { createAsyncThunk, createSlice, isAnyOf } from '@reduxjs/toolkit'
import type { RootState } from '@/app/store/store'

export type FolderDto = {
  id: string
  title: string
  workspaceId: string
  createdAt: string
  updatedAt: string
  deletedAt: Date
}

type State = {
  byWorkspace: Record<string, FolderDto[]>
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
}

type FolderListResponse = { ok: true; items: FolderDto[] } | { ok: false; message?: string }
type FolderResponse = { ok: true; item: FolderDto } | { ok: false; message?: string }
type BasicResponse = { ok: true } | { ok: false; message?: string }

const initialState: State = {
  byWorkspace: {},
  status: 'idle',
  error: null,
}

export const fetchFolders = createAsyncThunk<
  { workspaceId: string; items: FolderDto[] },
  { workspaceId: string },
  { rejectValue: string }
>('folders/fetch', async ({ workspaceId }, thunkApi) => {
  try {
    const res = await fetch(`/api/workspaces/${encodeURIComponent(workspaceId)}/folders`)
    const data = (await res.json()) as FolderListResponse
    if (!res.ok) return thunkApi.rejectWithValue(data.ok ? 'Помилка завантаження' : data.message ?? 'Помилка завантаження')
    if (!data.ok) return thunkApi.rejectWithValue(data.message ?? 'Помилка завантаження')
    return { workspaceId, items: data.items }
  } catch {
    return thunkApi.rejectWithValue('Не вдалося підключитися до сервера')
  }
})

export const createFolder = createAsyncThunk<
  FolderDto,
  { workspaceId: string; title: string },
  { rejectValue: string }
>('folders/create', async ({ workspaceId, title }, thunkApi) => {
  try {
    const res = await fetch(`/api/workspaces/${encodeURIComponent(workspaceId)}/folders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
    const data = (await res.json()) as FolderResponse
    if (!res.ok) return thunkApi.rejectWithValue(data.ok ? 'Помилка створення' : data.message ?? 'Помилка створення')
    if (!data.ok) return thunkApi.rejectWithValue(data.message ?? 'Помилка створення')
    return data.item
  } catch {
    return thunkApi.rejectWithValue('Не вдалося підключитися до сервера')
  }
})

export const updateFolder = createAsyncThunk<
  FolderDto,
  { id: string; title: string },
  { rejectValue: string }
>('folders/update', async ({ id, title }, thunkApi) => {
  try {
    const res = await fetch(`/api/folders/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
    const data = (await res.json()) as FolderResponse
    if (!res.ok) return thunkApi.rejectWithValue(data.ok ? 'Помилка оновлення' : data.message ?? 'Помилка оновлення')
    if (!data.ok) return thunkApi.rejectWithValue(data.message ?? 'Помилка оновлення')
    return data.item
  } catch {
    return thunkApi.rejectWithValue('Не вдалося підключитися до сервера')
  }
})

export const deleteFolder = createAsyncThunk<
  { id: string; workspaceId: string },
  { id: string; workspaceId: string },
  { rejectValue: string }
>('folders/delete', async ({ id, workspaceId }, thunkApi) => {
  try {
    const res = await fetch(`/api/folders/${encodeURIComponent(id)}`, { method: 'DELETE' })
    const data = (await res.json()) as BasicResponse
    if (!res.ok) return thunkApi.rejectWithValue(data.ok ? 'Помилка видалення' : data.message ?? 'Помилка видалення')
    if (!data.ok) return thunkApi.rejectWithValue(data.message ?? 'Помилка видалення')
    return { id, workspaceId }
  } catch {
    return thunkApi.rejectWithValue('Не вдалося підключитися до сервера')
  }
})

const slice = createSlice({
  name: 'folders',
  initialState,
  reducers: {
    clearFoldersError(s) {
      s.error = null
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchFolders.pending, (s) => {
      s.status = 'loading'
      s.error = null
    })
    b.addCase(fetchFolders.fulfilled, (s, a) => {
      s.status = 'succeeded'
      s.byWorkspace[a.payload.workspaceId] = a.payload.items
    })
    b.addCase(fetchFolders.rejected, (s, a) => {
      s.status = 'failed'
      s.error = a.payload ?? 'Помилка'
    })

    b.addCase(createFolder.fulfilled, (s, a) => {
      const wsId = a.payload.workspaceId
      s.byWorkspace[wsId] = [a.payload, ...(s.byWorkspace[wsId] ?? [])]
    })

    b.addCase(updateFolder.fulfilled, (s, a) => {
      const wsId = a.payload.workspaceId
      s.byWorkspace[wsId] = (s.byWorkspace[wsId] ?? []).map((x) => (x.id === a.payload.id ? a.payload : x))
    })

    b.addCase(deleteFolder.fulfilled, (s, a) => {
      const { id, workspaceId } = a.payload
      s.byWorkspace[workspaceId] = (s.byWorkspace[workspaceId] ?? []).filter((x) => x.id !== id)
    })

    b.addMatcher(
      isAnyOf(createFolder.pending, updateFolder.pending, deleteFolder.pending),
      (s) => {
        s.error = null
      }
    )
    b.addMatcher(
      isAnyOf(createFolder.rejected, updateFolder.rejected, deleteFolder.rejected),
      (s, a) => {
        s.error = a.payload ?? 'Помилка'
      }
    )
  },
})

export const { clearFoldersError } = slice.actions
export const foldersReducer = slice.reducer

export const selectFoldersByWorkspace = (state: RootState, workspaceId: string) =>
  state.folders.byWorkspace[workspaceId] ?? []
