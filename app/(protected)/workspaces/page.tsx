'use client'

import { useEffect, useMemo, useState } from 'react'
import { Alert, Button, Card, Input, Tree, Modal, Space, Typography } from 'antd'
import { useRouter } from 'next/navigation'
import { useAppDispatch, useAppSelector } from '@/app/store/hooks'
import { createWorkspace, deleteWorkspace, fetchWorkspaces } from '@/app/store/slices/workspaces.slice'

type DeleteTarget = { id: string; title: string }

export default function WorkspacesPage() {
  const router = useRouter()
  const dispatch = useAppDispatch()
  const { items, error } = useAppSelector((s) => s.workspaces)

  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    dispatch(fetchWorkspaces())
  }, [dispatch])

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return items
    return items.filter((x) => x.title.toLowerCase().includes(t))
  }, [items, q])

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <Card style={{ width: '100%', maxWidth: 900 }}>
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Typography.Title level={3} style={{ margin: 0 }}>
              Workspaces
            </Typography.Title>
            <Button type="primary" onClick={() => {
              setCreateError(null)
              setOpen(true)
            }}>
              Створити workspace
            </Button>
          </Space>

          {error && <Alert type="error" showIcon title={error} />}

          <Input placeholder="Пошук..." value={q} onChange={(e) => setQ(e.target.value)} allowClear />

          <Tree
              showLine
              defaultExpandAll
              treeData={filtered.map((ws) => ({
                title: (
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <span>{ws.title}</span>
                    <Space>
                      <Button
                        type="link"
                        onClick={(e) => {
                          e.stopPropagation(); // Запобігає розгортанню/згортанню вузла при кліку на кнопку
                          router.push(`/workspace/${ws.id}`);
                        }}
                      >
                        Відкрити
                      </Button>
                      <Button
                        type="link"
                        danger
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteTarget({ id: ws.id, title: ws.title })
                          setDeleteError(null)
                        }}
                      >
                        Видалити
                      </Button>
                    </Space>
                  </div>
                ),
                key: ws.id,
              }))}
              blockNode
            />

          <Button onClick={() => dispatch(fetchWorkspaces())}>Оновити список</Button>
        </Space>
      </Card>

      <Modal
        open={open}
        title="Новий Workspace"
        okText="Створити"
        cancelText="Скасувати"
        onCancel={() => {
          setOpen(false)
          setTitle('')
          setCreateError(null)
        }}
        onOk={async () => {
          const t = title.trim()
          if (!t) return
          setCreateError(null)
          const res = await dispatch(createWorkspace({ title: t }))
          if (createWorkspace.fulfilled.match(res)) {
            setOpen(false)
            setTitle('')
            setCreateError(null)
            router.push(`/workspace/${res.payload.id}`)
          } else if (createWorkspace.rejected.match(res)) {
            setCreateError(res.payload ?? 'Не вдалося створити workspace')
          }
        }}
      >
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
          {createError && <Alert type="error" showIcon title={createError} />}
          <Input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              setCreateError(null)
            }}
            placeholder="Назва"
          />
        </Space>
      </Modal>

      <Modal
        open={!!deleteTarget}
        title="Видалити workspace?"
        okText="Видалити"
        cancelText="Скасувати"
        okButtonProps={{ danger: true }}
        confirmLoading={deleting}
        onCancel={() => {
          setDeleteTarget(null)
          setDeleteError(null)
        }}
        onOk={async () => {
          if (!deleteTarget) return

          setDeleting(true)
          setDeleteError(null)
          const res = await dispatch(deleteWorkspace({ id: deleteTarget.id }))
          setDeleting(false)

          if (deleteWorkspace.fulfilled.match(res)) {
            setDeleteTarget(null)
          } else if (deleteWorkspace.rejected.match(res)) {
            setDeleteError(res.payload ?? 'Не вдалося видалити workspace')
          }
        }}
      >
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
          {deleteError && <Alert type="error" showIcon title={deleteError} />}
          <Typography.Paragraph style={{ marginBottom: 0 }}>
            {`Workspace "${deleteTarget?.title ?? ''}" буде переміщено до сміття разом із папками та нотатками.`}
          </Typography.Paragraph>
        </Space>
      </Modal>
    </div>
  )
}
