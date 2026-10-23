import { Suspense } from 'react'
import RequireGuest from '@/app/shared/auth/RequireGuest'

export default function GuestLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <RequireGuest>{children}</RequireGuest>
    </Suspense>
  )
}
