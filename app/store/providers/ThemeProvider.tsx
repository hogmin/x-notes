'use client'

import { useCallback, useMemo } from 'react'
import { ConfigProvider, theme as antdTheme } from 'antd'
import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from 'next-themes'

export type AppTheme = 'light' | 'dark'

function AntdThemeProvider({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useNextTheme()
  const theme: AppTheme = resolvedTheme === 'dark' ? 'dark' : 'light'

  const antdConfig = useMemo(() => {
    const isDark = theme === 'dark'

    return {
      theme: {
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        cssVar: {
          prefix: 'app',
        },
        token: {
          borderRadius: 6,
          colorPrimary: '#2563eb',
          colorBgBase: isDark ? '#0f172a' : '#f6f8fb',
          colorBgLayout: isDark ? '#0f172a' : '#f6f8fb',
          colorBgContainer: isDark ? '#111827' : '#ffffff',
          colorBgElevated: isDark ? '#172033' : '#ffffff',
          colorBorder: isDark ? 'rgba(148, 163, 184, 0.22)' : 'rgba(15, 23, 42, 0.12)',
          colorTextBase: isDark ? 'rgba(248, 250, 252, 0.94)' : 'rgba(15, 23, 42, 0.92)',
          colorTextSecondary: isDark ? 'rgba(203, 213, 225, 0.74)' : 'rgba(71, 85, 105, 0.76)',
        },
      },
    }
  }, [theme])

  return <ConfigProvider {...antdConfig}>{children}</ConfigProvider>
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="light"
      disableTransitionOnChange
      enableSystem={false}
      storageKey="xnotes-theme"
    >
      <AntdThemeProvider>{children}</AntdThemeProvider>
    </NextThemesProvider>
  )
}

export function useTheme() {
  const { resolvedTheme, setTheme } = useNextTheme()
  const theme: AppTheme = resolvedTheme === 'dark' ? 'dark' : 'light'

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }, [setTheme, theme])

  return { theme, setTheme: (value: AppTheme) => setTheme(value), toggleTheme }
}
