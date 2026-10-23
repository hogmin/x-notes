'use client'

import { ReactNode } from 'react'
import { Provider } from 'react-redux'
import { store } from '@/app/store/store'
import { ThemeProvider } from '@/app/store/providers/ThemeProvider'
import AuthBootstrap from '@/app/store/AuthBootstrap'
import AppHeader from '@/app/shared/layout/AppHeader'

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <AuthBootstrap />
        <AppHeader />
        {children}
      </ThemeProvider>
    </Provider>
  )
}
