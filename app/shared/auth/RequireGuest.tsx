'use client'

import { ReactNode, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Spin } from 'antd'
import { useAppSelector } from '@/app/store/hooks'

export default function RequireGuest({ children }: { children: ReactNode }) {
  const router = useRouter()
  const sp = useSearchParams()
  const user = useAppSelector((s) => s.auth.user)

  useEffect(() => {
    if (!user) return
    const next = sp.get('next') || '/settings'
    router.replace(next)
  }, [user, router, sp])

  if (user) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <Spin size="large" />
      </div>
    )
  }

  return <>{children}</>
}
