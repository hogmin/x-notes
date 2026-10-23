'use client'

import { useEffect } from 'react'
import { useAppDispatch } from './hooks'
import { authMe } from './slices/auth.slice'

export default function AuthBootstrap() {
  const dispatch = useAppDispatch()

  useEffect(() => {
    dispatch(authMe())
  }, [dispatch])

  return null
}
