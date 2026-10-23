'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card, Input, Space, Typography, Alert } from 'antd'
import { Formik } from 'formik'
import * as Yup from 'yup'
import { useAppDispatch } from '@/app/store/hooks'
import { authRegister } from '@/app/store/slices/auth.slice'
import styles from './Register.module.css'

type FormValues = {
  email: string
  password: string
  confirmPassword: string
}

export default function RegisterPage() {
  const router = useRouter()
  const dispatch = useAppDispatch()
  const [serverError, setServerError] = useState<string | null>(null)

  const schema = useMemo(
    () =>
      Yup.object({
        email: Yup.string().email('Некоректний email').required("Обов'язково"),
        password: Yup.string().min(8, 'Мінімум 8 символів').required("Обов'язково"),
        confirmPassword: Yup.string()
          .oneOf([Yup.ref('password')], 'Паролі не співпадають')
          .required("Обов'язково"),
      }),
    []
  )

  const initialValues: FormValues = { email: '', password: '', confirmPassword: '' }

  return (
    <div className={styles.page}>
      <Card className={styles.card}>
        <Typography.Title level={3} className={styles.title}>
          Реєстрація
        </Typography.Title>

        {serverError && <Alert type="error" showIcon title={serverError} className={styles.alert} />}

        <Formik
          initialValues={initialValues}
          validationSchema={schema}
          onSubmit={async (values, helpers) => {
            setServerError(null)
            helpers.setSubmitting(true)

            const res = await dispatch(authRegister({ email: values.email, password: values.password }))
            if (authRegister.fulfilled.match(res)) {
              router.push('/workspaces')
            } else {
              setServerError(res.payload ?? 'Помилка реєстрації')
            }
            helpers.setSubmitting(false)
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

                <div>
                  <Input.Password
                    name="confirmPassword"
                    placeholder="Повторіть пароль"
                    value={f.values.confirmPassword}
                    onChange={f.handleChange}
                    onBlur={f.handleBlur}
                    status={
                      f.touched.confirmPassword && f.errors.confirmPassword ? 'error' : ''
                    }
                  />
                  {f.touched.confirmPassword && f.errors.confirmPassword && (
                    <div className={styles.error}>{f.errors.confirmPassword}</div>
                  )}
                </div>

                <Space className={styles.actions}>
                  <Button type="primary" htmlType="submit" loading={f.isSubmitting}>
                    Зареєструватися
                  </Button>
                  <Button onClick={() => router.push('/auth/login')}>Увійти</Button>
                </Space>
              </Space>
            </form>
          )}
        </Formik>
      </Card>
    </div>
  )
}
