import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit'

export type AuthUser = {
  id: string
  email: string
}

type AuthState = {
  user: AuthUser | null
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
  checked: boolean
}

type AuthUserResponse = { ok: true; user: AuthUser } | { ok: false; message?: string }
type AuthMeResponse = { ok: true; user: AuthUser | null } | { ok: false; message?: string }
type BasicResponse = { ok: true } | { ok: false; message?: string }

const initialState: AuthState = {
  user: null,
  status: 'idle',
  error: null,
  checked: false
}

export const authRegister = createAsyncThunk<
  AuthUser,
  { email: string; password: string },
  { rejectValue: string }
>('auth/register', async (payload, thunkApi) => {
  try {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const data = (await res.json()) as AuthUserResponse
    if (!res.ok) {
      return thunkApi.rejectWithValue(data.ok ? 'Помилка реєстрації' : data.message ?? 'Помилка реєстрації')
    }
    if (!data.ok) {
      return thunkApi.rejectWithValue(data.message ?? 'Помилка реєстрації')
    }

    return data.user
  } catch {
    return thunkApi.rejectWithValue('Не вдалося підключитися до сервера')
  }
})

export const authLogin = createAsyncThunk<
  AuthUser,
  { email: string; password: string },
  { rejectValue: string }
>('auth/login', async (payload, thunkApi) => {
  try {
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const data = (await res.json()) as AuthUserResponse
    if (!res.ok) {
      return thunkApi.rejectWithValue(data.ok ? 'Невірний email або пароль' : data.message ?? 'Невірний email або пароль')
    }
    if (!data.ok) {
      return thunkApi.rejectWithValue(data.message ?? 'Невірний email або пароль')
    }

    return data.user
  } catch {
    return thunkApi.rejectWithValue('Не вдалося підключитися до сервера')
  }
})

export const authMe = createAsyncThunk<
  AuthUser | null,
  void,
  { rejectValue: string }
>('auth/me', async (_, thunkApi) => {
  try {
    const res = await fetch('/api/sessions/current')
    const data = (await res.json()) as AuthMeResponse
    if (!res.ok) return thunkApi.rejectWithValue(data.ok ? 'Помилка' : data.message ?? 'Помилка')
    if (!data.ok) return thunkApi.rejectWithValue(data.message ?? 'Помилка')
    return data.user ?? null
  } catch {
    return thunkApi.rejectWithValue('Не вдалося підключитися до сервера')
  }
})

export const authLogout = createAsyncThunk<void, void, { rejectValue: string }>(
  'auth/logout',
  async (_, thunkApi) => {
    try {
      const res = await fetch('/api/sessions/current', { method: 'DELETE' })
      const data = (await res.json()) as BasicResponse
      if (!res.ok) return thunkApi.rejectWithValue(data.ok ? 'Помилка' : data.message ?? 'Помилка')
      if (!data.ok) return thunkApi.rejectWithValue(data.message ?? 'Помилка')
    } catch {
      return thunkApi.rejectWithValue('Не вдалося підключитися до сервера')
    }
  }
)

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearAuthError(state) {
      state.error = null
    },
    setUser(state, action: PayloadAction<AuthUser | null>) {
      state.user = action.payload
    },
  },
  extraReducers: (b) => {
    b.addCase(authLogout.fulfilled, (s) => {
      s.user = null
      s.status = 'idle'
      s.error = null
      s.checked = true
    })

    b.addCase(authMe.pending, (s) => {
      s.checked = false
    })
    b.addCase(authMe.fulfilled, (s, a) => {
      s.user = a.payload
      s.checked = true
    })
    b.addCase(authMe.rejected, (s) => {
      s.user = null
      s.checked = true
    })

    b.addCase(authRegister.pending, (state) => {
      state.status = 'loading'
      state.error = null
    })
    b.addCase(authRegister.fulfilled, (state, action) => {
      state.status = 'succeeded'
      state.user = action.payload
    })
    b.addCase(authRegister.rejected, (state, action) => {
      state.status = 'failed'
      state.error = action.payload ?? 'Помилка реєстрації'
    })

    b.addCase(authLogin.pending, (state) => {
      state.status = 'loading'
      state.error = null
    })
    b.addCase(authLogin.fulfilled, (state, action) => {
      state.status = 'succeeded'
      state.user = action.payload
    })
    b.addCase(authLogin.rejected, (state, action) => {
      state.status = 'failed'
      state.error = action.payload ?? 'Помилка авторизації'
    })
  },
})

export const { clearAuthError, setUser } = authSlice.actions
export const authReducer = authSlice.reducer
