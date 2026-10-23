'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Alert, Button, Card, Divider, Input, Modal, Space, Typography } from 'antd'
import { Formik } from 'formik'
import * as Yup from 'yup'
import { useAppDispatch, useAppSelector } from '@/app/store/hooks'
import { authLogout, setUser, type AuthUser } from '@/app/store/slices/auth.slice'
import styles from './Settings.module.css'

type UserUpdateResponse = { ok: true; user: AuthUser } | { ok: false; message?: string }
type BasicResponse = { ok: true } | { ok: false; message?: string }

export default function SettingsPage() {
  const router = useRouter()
  const dispatch = useAppDispatch()

  const user = useAppSelector((s) => s.auth.user)
  const authStatus = useAppSelector((s) => s.auth.status)

  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const emailSchema = useMemo(
    () =>
      Yup.object({
        email: Yup.string().email('Некоректний email').required("Обов'язково"),
      }),
    []
  )

  const passSchema = useMemo(
    () =>
      Yup.object({
        currentPassword: Yup.string().required("Обов'язково"),
        newPassword: Yup.string().min(6, 'Мінімум 6 символів').required("Обов'язково"),
      }),
    []
  )

  if (authStatus === 'loading') {
    return (
      <div className={styles.center}>
        <Typography.Text>Завантаження...</Typography.Text>
      </div>
    )
  }

  if (!user) {
    return (
      <div className={styles.center}>
        <Card className={styles.card}>
          <Typography.Title level={4} style={{ marginTop: 0 }}>
            Налаштування
          </Typography.Title>
          <Typography.Paragraph type="secondary">
            Потрібно увійти, щоб переглянути налаштування.
          </Typography.Paragraph>
          <Button type="primary" onClick={() => router.replace('/auth/login')}>
            Увійти
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Typography.Title level={3} style={{ margin: 0 }}>
              Налаштування
            </Typography.Title>
            <Typography.Text type="secondary">Керування профілем, паролем і сесією.</Typography.Text>
          </div>

          {msg && (
            <Alert
              type={msg.type}
              showIcon
              title={msg.text}
              action={
                <Button size="small" onClick={() => setMsg(null)}>
                  OK
                </Button>
              }
            />
          )}

          <Card>
            <Typography.Title level={4} style={{ marginTop: 0 }}>
              Акаунт і безпека
            </Typography.Title>
            <Typography.Paragraph type="secondary">
              Оновлення email і пароля виконується напряму в базі даних.
            </Typography.Paragraph>

            <Divider />

            <Formik
              initialValues={{ email: user.email }}
              enableReinitialize
              validationSchema={emailSchema}
              onSubmit={async (values) => {
                setBusy(true)
                setMsg(null)
                try {
                  const res = await fetch('/api/users/me', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: values.email }),
                  })
                  const data = (await res.json()) as UserUpdateResponse
                  if (!res.ok || !data.ok) {
                    setMsg({ type: 'error', text: data.ok ? 'Помилка' : data.message ?? 'Помилка' })
                    return
                  }

                  dispatch(setUser(data.user))
                  setMsg({ type: 'success', text: 'Email успішно змінено' })
                } catch {
                  setMsg({ type: 'error', text: 'Не вдалося підключитися до сервера' })
                } finally {
                  setBusy(false)
                }
              }}
            >
              {(f) => (
                <form onSubmit={f.handleSubmit}>
                  <Space orientation="vertical" size="small" className={styles.full}>
                    <Typography.Text strong>Email</Typography.Text>
                    <Input
                      name="email"
                      value={f.values.email}
                      onChange={f.handleChange}
                      onBlur={f.handleBlur}
                      status={f.touched.email && f.errors.email ? 'error' : ''}
                    />
                    {f.touched.email && f.errors.email && <div className={styles.error}>{f.errors.email}</div>}
                    <Button type="primary" htmlType="submit" loading={busy}>
                      Змінити email
                    </Button>
                  </Space>
                </form>
              )}
            </Formik>

            <Divider />

            <Formik
              initialValues={{ currentPassword: '', newPassword: '' }}
              validationSchema={passSchema}
              onSubmit={async (values, f) => {
                setBusy(true)
                setMsg(null)
                try {
                  const res = await fetch('/api/users/me/password', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(values),
                  })
                  const data = (await res.json()) as BasicResponse
                  if (!res.ok || !data.ok) {
                    setMsg({ type: 'error', text: data.ok ? 'Помилка' : data.message ?? 'Помилка' })
                    return
                  }
                  f.resetForm()
                  setMsg({ type: 'success', text: 'Пароль успішно змінено' })
                } catch {
                  setMsg({ type: 'error', text: 'Не вдалося підключитися до сервера' })
                } finally {
                  setBusy(false)
                }
              }}
            >
              {(f) => (
                <form onSubmit={f.handleSubmit}>
                  <Space orientation="vertical" size="small" className={styles.full}>
                    <Typography.Text strong>Поточний пароль</Typography.Text>
                    <Input.Password
                      name="currentPassword"
                      value={f.values.currentPassword}
                      onChange={f.handleChange}
                      onBlur={f.handleBlur}
                      status={f.touched.currentPassword && f.errors.currentPassword ? 'error' : ''}
                    />
                    {f.touched.currentPassword && f.errors.currentPassword && (
                      <div className={styles.error}>{f.errors.currentPassword}</div>
                    )}

                    <Typography.Text strong>Новий пароль</Typography.Text>
                    <Input.Password
                      name="newPassword"
                      value={f.values.newPassword}
                      onChange={f.handleChange}
                      onBlur={f.handleBlur}
                      status={f.touched.newPassword && f.errors.newPassword ? 'error' : ''}
                    />
                    {f.touched.newPassword && f.errors.newPassword && (
                      <div className={styles.error}>{f.errors.newPassword}</div>
                    )}

                    <Button type="primary" htmlType="submit" loading={busy}>
                      Змінити пароль
                    </Button>
                  </Space>
                </form>
              )}
            </Formik>
          </Card>

          <Card>
            <Typography.Title level={4} style={{ marginTop: 0 }}>
              Сесія
            </Typography.Title>
            <Typography.Paragraph type="secondary">
              Вихід термінує сесію на сервері та видаляє httpOnly cookie.
            </Typography.Paragraph>
            <Button
              danger
              loading={busy}
              onClick={async () => {
                setBusy(true)
                setMsg(null)
                const res = await dispatch(authLogout())
                setBusy(false)
                if (authLogout.rejected.match(res)) {
                  setMsg({ type: 'error', text: res.payload ?? 'Помилка виходу' })
                  return
                }
                router.replace('/auth/login')
              }}
            >
              Вийти
            </Button>
          </Card>

          <Card>
            <Typography.Title level={4} style={{ marginTop: 0 }}>
              Небезпечна зона
            </Typography.Title>
            <Typography.Paragraph type="secondary">
              Видалення акаунта виконає soft-delete в БД і завершить сесію.
            </Typography.Paragraph>
            <Button danger onClick={() => setDeleteOpen(true)}>
              Видалити акаунт
            </Button>
          </Card>
        </Space>
      </div>

      <Modal
        open={deleteOpen}
        title="Підтвердження"
        okText="Видалити"
        cancelText="Скасувати"
        okButtonProps={{ danger: true, loading: busy }}
        onCancel={() => setDeleteOpen(false)}
        onOk={async () => {
          setBusy(true)
          setMsg(null)
          try {
            const res = await fetch('/api/users/me', { method: 'DELETE' })
            const data = (await res.json()) as BasicResponse
            if (!res.ok || !data.ok) {
              setMsg({ type: 'error', text: data.ok ? 'Помилка' : data.message ?? 'Помилка' })
              setBusy(false)
              return
            }
            setBusy(false)
            router.replace('/auth/login')
          } catch {
            setBusy(false)
            setMsg({ type: 'error', text: 'Не вдалося підключитися до сервера' })
          }
        }}
      >
        <Typography.Paragraph style={{ marginBottom: 0 }}>
          Ти впевнений? Дію неможливо скасувати.
        </Typography.Paragraph>
      </Modal>
    </main>
  )
}
