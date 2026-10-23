import RequireAuth from '@/app/shared/auth/RequireAuth'

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>
}
