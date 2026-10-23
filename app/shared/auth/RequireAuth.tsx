'use client'

import { ReactNode, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Spin } from 'antd'
import { useAppSelector } from '@/app/store/hooks'

export default function RequireAuth({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, checked } = useAppSelector((s) => s.auth)

  useEffect(() => {
    if (!checked) return
    if (user) return
    router.replace(`/auth/login?next=${encodeURIComponent(pathname)}`)
  }, [checked, user, router, pathname])

  if (!checked || !user) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <Spin size="large" />
      </div>
    )
  }

  return <>{children}</>
}
