'use client'

import { useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button, Card, Input, Space, Typography, Alert } from 'antd'
import { Formik } from 'formik'
import * as Yup from 'yup'
import styles from './Login.module.css'

import { useAppDispatch, useAppSelector } from '@/app/store/hooks'
import { authLogin, clearAuthError } from '@/app/store/slices/auth.slice'

type FormValues = {
  email: string
  password: string
}

export default function LoginPage() {
  const router = useRouter()
  const dispatch = useAppDispatch()
  const { status, error } = useAppSelector((s) => s.auth)
  const sp = useSearchParams()

  const schema = useMemo(
    () =>
      Yup.object({
        email: Yup.string().email('Некоректний email').required("Обов'язково"),
        password: Yup.string().required("Обов'язково"),
      }),
    []
  )

  const initialValues: FormValues = {
    email: '',
    password: '',
  }

  return (
    <div className={styles.page}>
      <Card className={styles.card}>
        <Typography.Title level={3} className={styles.title}>
          Авторизація
        </Typography.Title>

        {error && (
          <Alert
            type="error"
            showIcon
            title={error}
            className={styles.alert}
          />
        )}

        <Formik
          initialValues={initialValues}
          validationSchema={schema}
          onSubmit={async (values) => {
            dispatch(clearAuthError())

            const res = await dispatch(
              authLogin({
                email: values.email,
                password: values.password,
              })
            )

            if (authLogin.fulfilled.match(res)) {
              const next = sp.get('next') || '/workspaces'
              router.push(next)
            }
          }}
        >
          {(f) => (
            <form onSubmit={f.handleSubmit} className={styles.form}>
              <Space orientation="vertical" size="middle" className={styles.full}>
                <div>
                  <Input
                    name="email"
                    placeholder="Email"
                    value={f.values.email}
                    onChange={f.handleChange}
                    onBlur={f.handleBlur}
                    status={f.touched.email && f.errors.email ? 'error' : ''}
                  />
                  {f.touched.email && f.errors.email && (
                    <div className={styles.error}>{f.errors.email}</div>
                  )}
                </div>

                <div>
                  <Input.Password
                    name="password"
                    placeholder="Пароль"
                    value={f.values.password}
                    onChange={f.handleChange}
                    onBlur={f.handleBlur}
                    status={f.touched.password && f.errors.password ? 'error' : ''}
                  />
                  {f.touched.password && f.errors.password && (
                    <div className={styles.error}>{f.errors.password}</div>
                  )}
                </div>

                <Space className={styles.actions}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={status === 'loading'}
                  >
                    Увійти
                  </Button>

                  <Button onClick={() => router.push('/auth/register')}>
                    Реєстрація
                  </Button>
                </Space>
              </Space>
            </form>
          )}
        </Formik>
      </Card>
    </div>
  )
}
