import { createAsyncThunk, createSlice, isAnyOf } from '@reduxjs/toolkit'

export type WorkspaceDto = {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  deletedAt: Date
}

type State = {
  items: WorkspaceDto[]
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
}

type WorkspaceListResponse = { ok: true; items: WorkspaceDto[] } | { ok: false; message?: string }
type WorkspaceResponse = { ok: true; item: WorkspaceDto } | { ok: false; message?: string }
type BasicResponse = { ok: true } | { ok: false; message?: string }

const initialState: State = {
  items: [],
  status: 'idle',
  error: null,
}

export const fetchWorkspaces = createAsyncThunk<
  WorkspaceDto[],
  void,
  { rejectValue: string }
>('workspaces/fetch', async (_, thunkApi) => {
  try {
    const res = await fetch('/api/workspaces')
    const data = (await res.json()) as WorkspaceListResponse
    if (!res.ok) return thunkApi.rejectWithValue(data.ok ? 'Помилка завантаження' : data.message ?? 'Помилка завантаження')
    if (!data.ok) return thunkApi.rejectWithValue(data.message ?? 'Помилка завантаження')
    return data.items
  } catch {
    return thunkApi.rejectWithValue('Не вдалося підключитися до сервера')
  }
})

export const fetchWorkspaceById = createAsyncThunk<
  WorkspaceDto,
  { id: string },
  { rejectValue: string }
>('workspace/fetchById', async ({ id }, thunkApi) => {
  try {
    const res = await fetch(`/api/workspaces/${encodeURIComponent(id)}`)
    const data = (await res.json()) as WorkspaceResponse
    if (!res.ok) return thunkApi.rejectWithValue(data.ok ? 'Помилка завантаження' : data.message ?? 'Помилка завантаження')
    if (!data.ok) return thunkApi.rejectWithValue(data.message ?? 'Помилка завантаження')
    return data.item
  } catch {
    return thunkApi.rejectWithValue('Не вдалося підключитися до сервера')
  }
})


export const createWorkspace = createAsyncThunk<
  WorkspaceDto,
  { title: string },
  { rejectValue: string }
>('workspaces/create', async (payload, thunkApi) => {
  try {
    const res = await fetch('/api/workspaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: payload.title }),
    })
    const data = (await res.json()) as WorkspaceResponse
    if (!res.ok) return thunkApi.rejectWithValue(data.ok ? 'Помилка створення' : data.message ?? 'Помилка створення')
    if (!data.ok) return thunkApi.rejectWithValue(data.message ?? 'Помилка створення')
    return data.item
  } catch {
    return thunkApi.rejectWithValue('Не вдалося підключитися до сервера')
  }
})

export const updateWorkspace = createAsyncThunk<
  WorkspaceDto,
  { id: string; title: string },
  { rejectValue: string }
>('workspaces/update', async (payload, thunkApi) => {
  try {
    const res = await fetch(`/api/workspaces/${encodeURIComponent(payload.id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: payload.title }),
    })
    const data = (await res.json()) as WorkspaceResponse
    if (!res.ok) return thunkApi.rejectWithValue(data.ok ? 'Помилка оновлення' : data.message ?? 'Помилка оновлення')
    if (!data.ok) return thunkApi.rejectWithValue(data.message ?? 'Помилка оновлення')
    return data.item
  } catch {
    return thunkApi.rejectWithValue('Не вдалося підключитися до сервера')
  }
})

export const deleteWorkspace = createAsyncThunk<
  string,
  { id: string },
  { rejectValue: string }
>('workspaces/delete', async ({ id }, thunkApi) => {
  try {
    const res = await fetch(`/api/workspaces/${encodeURIComponent(id)}`, { method: 'DELETE' })
    const data = (await res.json()) as BasicResponse
    if (!res.ok) return thunkApi.rejectWithValue(data.ok ? 'Помилка видалення' : data.message ?? 'Помилка видалення')
    if (!data.ok) return thunkApi.rejectWithValue(data.message ?? 'Помилка видалення')
    return id
  } catch {
    return thunkApi.rejectWithValue('Не вдалося підключитися до сервера')
  }
})

const slice = createSlice({
  name: 'workspaces',
  initialState,
  reducers: {
    clearWorkspacesError(state) {
      state.error = null
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchWorkspaces.pending, (s) => {
      s.status = 'loading'
      s.error = null
    })
    b.addCase(fetchWorkspaces.fulfilled, (s, a) => {
      s.status = 'succeeded'
      s.items = a.payload
    })
    b.addCase(fetchWorkspaces.rejected, (s, a) => {
      s.status = 'failed'
      s.error = a.payload ?? 'Помилка'
    })
    b.addCase(fetchWorkspaceById.fulfilled, (s, a) => {
      const i = s.items.findIndex((x) => x.id === a.payload.id)
      if (i === -1) s.items = [a.payload, ...s.items]
      else s.items[i] = a.payload
    })


    b.addCase(createWorkspace.fulfilled, (s, a) => {
      s.items = [a.payload, ...s.items]
    })

    b.addCase(updateWorkspace.fulfilled, (s, a) => {
      s.items = s.items.map((x) => (x.id === a.payload.id ? a.payload : x))
    })

    b.addCase(deleteWorkspace.fulfilled, (s, a) => {
      s.items = s.items.filter((x) => x.id !== a.payload)
    })

    b.addMatcher(
      isAnyOf(createWorkspace.pending, updateWorkspace.pending, deleteWorkspace.pending),
      (s) => {
        s.error = null
      }
    )
    b.addMatcher(
      isAnyOf(createWorkspace.rejected, updateWorkspace.rejected, deleteWorkspace.rejected),
      (s, a) => {
        s.error = a.payload ?? 'Помилка'
      }
    )
  },
})

export const { clearWorkspacesError } = slice.actions
export const workspacesReducer = slice.reducer
