'use client'

import { useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Button, Space, Switch, Typography } from 'antd'
import { MoonOutlined, SunOutlined } from '@ant-design/icons'
import { useTheme } from '@/app/store/providers/ThemeProvider'
import { useAppDispatch, useAppSelector } from '@/app/store/hooks'
import { authLogout } from '@/app/store/slices/auth.slice'
import styles from './AppHeader.module.css'

export default function AppHeader() {
  const router = useRouter()
  const pathname = usePathname()
  const { theme, toggleTheme } = useTheme()

  const dispatch = useAppDispatch()
  const user = useAppSelector((s) => s.auth.user)
  const [loggingOut, setLoggingOut] = useState(false)

  const isAuthPage = useMemo(() => pathname.startsWith('/auth/'), [pathname])

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.left} onClick={() => router.push('/')}>
          <div className={styles.logo} aria-hidden />
          <Typography.Text className={styles.brand}>X-Notes</Typography.Text>
        </div>

        <Space size="middle" className={styles.right}>
          <Space size="small" className={styles.themeBox}>
            <SunOutlined />
            <Switch
              checked={theme === 'dark'}
              onChange={toggleTheme}
              checkedChildren={<MoonOutlined />}
              unCheckedChildren={<SunOutlined />}
              aria-label="Перемикання теми"
            />
            <MoonOutlined />
          </Space>

          {!user ? (
            <>
              {!isAuthPage && (
                <Button type="primary" onClick={() => router.push('/auth/login')}>
                  Увійти
                </Button>
              )}
            </>
          ) : (
            <Space>
              <Button onClick={() => router.push('/workspaces')}>Workspaces</Button>
              <Button onClick={() => router.push('/trash')}>Сміття</Button>
              <Button onClick={() => router.push('/settings')}>Налаштування</Button>
              <Button
                danger
                loading={loggingOut}
                onClick={async () => {
                  setLoggingOut(true)
                  const result = await dispatch(authLogout())
                  setLoggingOut(false)

                  if (authLogout.fulfilled.match(result)) {
                    router.replace('/auth/login')
                    router.refresh()
                  }
                }}
              >
                Вийти
              </Button>
            </Space>
          )}
        </Space>
      </div>
    </header>
  )
}
