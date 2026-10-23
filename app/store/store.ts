import { configureStore } from '@reduxjs/toolkit'
import { authReducer } from './slices/auth.slice'
import { workspacesReducer } from './slices/workspaces.slice'
import { foldersReducer } from './slices/folders.slice'
import { notesReducer } from './slices/notes.slice'
import { trashReducer } from './slices/trash.slice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    workspaces: workspacesReducer,
    folders: foldersReducer,
    notes: notesReducer,
    trash: trashReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
