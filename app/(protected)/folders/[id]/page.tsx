'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Alert, Button, Card, Modal, Space, Spin, Typography } from 'antd'
import { useAppDispatch } from '@/app/store/hooks'
import { deleteFolder } from '@/app/store/slices/folders.slice'
import styles from './FolderPage.module.css'

type FolderNote = {
  id: string
  title: string
  updatedAt: string | null
}

type FolderDetail = {
  id: string
  title: string
  workspaceId: string
  workspaceTitle: string
  updatedAt: string | null
  notes: FolderNote[]
}

type FolderDetailResponse = { ok: true; item: FolderDetail } | { ok: false; message?: string }

export default function FolderPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const dispatch = useAppDispatch()

  const [folder, setFolder] = useState<FolderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadFolder() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/folders/${encodeURIComponent(id)}`)
        const data = (await res.json()) as FolderDetailResponse

        if (!res.ok || !data.ok) {
          const message = data.ok ? 'Не вдалося завантажити папку' : data.message ?? 'Не вдалося завантажити папку'
          if (!cancelled) setError(message)
          return
        }

        if (!cancelled) setFolder(data.item)
      } catch {
        if (!cancelled) setError('Не вдалося підключитися до сервера')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadFolder()

    return () => {
      cancelled = true
    }
  }, [id])

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.shell}>
          <Card>
            <Spin />
          </Card>
        </div>
      </div>
    )
  }

  if (error && !folder) {
    return (
      <div className={styles.page}>
        <div className={styles.shell}>
          <Alert type="error" showIcon title={error} />
        </div>
      </div>
    )
  }

  if (!folder) return null

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <Space orientation="vertical" size="middle" className={styles.full}>
          {error && <Alert type="error" showIcon title={error} closable onClose={() => setError(null)} />}

          <Card>
            <Space orientation="vertical" size="middle" className={styles.full}>
              <Space style={{ width: '100%', justifyContent: 'space-between' }} align="start">
                <div>
                  <Typography.Title level={3} style={{ margin: 0 }}>
                    {folder.title}
                  </Typography.Title>
                  <Typography.Text className={styles.meta}>
                    Workspace: {folder.workspaceTitle}
                  </Typography.Text>
                </div>

                <Space>
                  <Button onClick={() => router.push(`/workspace/${folder.workspaceId}`)}>Workspace</Button>
                  <Button
                    danger
                    onClick={() => {
                      setDeleteError(null)
                      setDeleteOpen(true)
                    }}
                  >
                    Видалити папку
                  </Button>
                </Space>
              </Space>

              {folder.notes.length ? (
                <Space orientation="vertical" size="small" className={styles.full}>
                  {folder.notes.map((note) => (
                    <Card key={note.id} size="small">
                      <Space style={{ width: '100%', justifyContent: 'space-between' }} align="start">
                        <Space orientation="vertical" size={2}>
                          <Typography.Text strong>{note.title}</Typography.Text>
                          {note.updatedAt ? (
                            <Typography.Text type="secondary">
                              Оновлено: {new Date(note.updatedAt).toLocaleString()}
                            </Typography.Text>
                          ) : null}
                        </Space>

                        <Button type="link" onClick={() => router.push(`/notes/${note.id}`)}>
                          Відкрити
                        </Button>
                      </Space>
                    </Card>
                  ))}
                </Space>
              ) : (
                <Typography.Text type="secondary">У папці немає нотаток</Typography.Text>
              )}
            </Space>
          </Card>
        </Space>
      </div>

      <Modal
        open={deleteOpen}
        title="Видалити папку?"
        okText="Видалити"
        cancelText="Скасувати"
        okButtonProps={{ danger: true }}
        confirmLoading={deleting}
        onCancel={() => {
          setDeleteOpen(false)
          setDeleteError(null)
        }}
        onOk={async () => {
          if (!folder) return

          setDeleting(true)
          setDeleteError(null)
          const res = await dispatch(deleteFolder({ id: folder.id, workspaceId: folder.workspaceId }))
          setDeleting(false)

          if (deleteFolder.fulfilled.match(res)) {
            setDeleteOpen(false)
            router.push(`/workspace/${folder.workspaceId}`)
          } else if (deleteFolder.rejected.match(res)) {
            setDeleteError(res.payload ?? 'Не вдалося видалити папку')
          }
        }}
      >
        <Space orientation="vertical" size="middle" className={styles.full}>
          {deleteError && <Alert type="error" showIcon title={deleteError} />}
          <Typography.Paragraph style={{ marginBottom: 0 }}>
            {`Папку "${folder.title}" буде переміщено до сміття разом із її нотатками.`}
          </Typography.Paragraph>
        </Space>
      </Modal>
    </div>
  )
}
