'use client'

import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { Alert, Button, Card, Modal, Space, Spin, Tabs, Typography } from 'antd'
import { useAppDispatch, useAppSelector } from '@/app/store/hooks'
import {
  clearTrashError,
  fetchTrash,
  purgeFolder,
  purgeNote,
  purgeWorkspace,
  restoreFolder,
  restoreNote,
  restoreWorkspace,
} from '@/app/store/slices/trash.slice'

type ConfirmAction = { kind: 'workspace' | 'folder' | 'note'; id: string; action: 'restore' | 'purge'; title: string }

function EmptyTrashList() {
  return <Typography.Text type="secondary">Нічого немає</Typography.Text>
}

function TrashRow({
  title,
  details,
  onRestore,
  onPurge,
}: {
  title: string
  details: ReactNode
  onRestore: () => void
  onPurge: () => void
}) {
  return (
    <Card size="small">
      <Space style={{ width: '100%', justifyContent: 'space-between' }} align="start">
        <div>
          <Typography.Text strong>{title}</Typography.Text>
          <div style={{ marginTop: 4 }}>{details}</div>
        </div>
        <Space>
          <Button onClick={onRestore}>Відновити</Button>
          <Button danger onClick={onPurge}>
            Видалити назавжди
          </Button>
        </Space>
      </Space>
    </Card>
  )
}

export default function TrashPage() {
  const dispatch = useAppDispatch()
  const { status, error, workspaces, folders, notes } = useAppSelector((s) => s.trash)

  const [confirm, setConfirm] = useState<ConfirmAction | null>(null)

  useEffect(() => {
    dispatch(fetchTrash())
  }, [dispatch])

  const wsCount = workspaces.length
  const fCount = folders.length
  const nCount = notes.length

  const wsSorted = useMemo(() => workspaces.slice(), [workspaces])
  const fSorted = useMemo(() => folders.slice(), [folders])
  const nSorted = useMemo(() => notes.slice(), [notes])

  const doAction = async () => {
    if (!confirm) return

    const { kind, id, action } = confirm

    if (kind === 'workspace' && action === 'restore') await dispatch(restoreWorkspace({ id }))
    if (kind === 'workspace' && action === 'purge') await dispatch(purgeWorkspace({ id }))

    if (kind === 'folder' && action === 'restore') await dispatch(restoreFolder({ id }))
    if (kind === 'folder' && action === 'purge') await dispatch(purgeFolder({ id }))

    if (kind === 'note' && action === 'restore') await dispatch(restoreNote({ id }))
    if (kind === 'note' && action === 'purge') await dispatch(purgeNote({ id }))

    setConfirm(null)
  }

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: '0 auto' }}>
      <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Typography.Title level={3} style={{ margin: 0 }}>
            Сміття
          </Typography.Title>

          <Button onClick={() => dispatch(fetchTrash())} loading={status === 'loading'}>
            Оновити
          </Button>
        </Space>

        {error && (
          <Alert
            type="error"
            showIcon
            title={error}
            action={
              <Button size="small" onClick={() => dispatch(clearTrashError())}>
                OK
              </Button>
            }
          />
        )}

        <Card>
          {status === 'loading' ? (
            <div style={{ display: 'grid', placeItems: 'center', minHeight: 200 }}>
              <Spin size="large" />
            </div>
          ) : (
            <Tabs
              defaultActiveKey="workspaces"
              items={[
                {
                  key: 'workspaces',
                  label: `Workspaces (${wsCount})`,
                  children: (
                    <Space orientation="vertical" size="small" style={{ width: '100%' }}>
                      {wsSorted.length ? (
                        wsSorted.map((x) => (
                          <TrashRow
                            key={x.id}
                            title={x.title}
                            details={
                              <Typography.Text type="secondary">
                                Власник: {x.ownerEmail}
                                {x.deletedAt ? ` / Видалено: ${new Date(x.deletedAt).toLocaleString()}` : ''}
                              </Typography.Text>
                            }
                            onRestore={() => setConfirm({ kind: 'workspace', id: x.id, action: 'restore', title: x.title })}
                            onPurge={() => setConfirm({ kind: 'workspace', id: x.id, action: 'purge', title: x.title })}
                          />
                        ))
                      ) : (
                        <EmptyTrashList />
                      )}
                    </Space>
                  ),
                },
                {
                  key: 'folders',
                  label: `Папки (${fCount})`,
                  children: (
                    <Space orientation="vertical" size="small" style={{ width: '100%' }}>
                      {fSorted.length ? (
                        fSorted.map((x) => (
                          <TrashRow
                            key={x.id}
                            title={x.title}
                            details={
                              <Space orientation="vertical" size={0}>
                                <Typography.Text type="secondary">Workspace: {x.workspaceTitle}</Typography.Text>
                                <Typography.Text type="secondary">Власник: {x.ownerEmail}</Typography.Text>
                                {x.deletedAt ? (
                                  <Typography.Text type="secondary">
                                    Видалено: {new Date(x.deletedAt).toLocaleString()}
                                  </Typography.Text>
                                ) : null}
                              </Space>
                            }
                            onRestore={() => setConfirm({ kind: 'folder', id: x.id, action: 'restore', title: x.title })}
                            onPurge={() => setConfirm({ kind: 'folder', id: x.id, action: 'purge', title: x.title })}
                          />
                        ))
                      ) : (
                        <EmptyTrashList />
                      )}
                    </Space>
                  ),
                },
                {
                  key: 'notes',
                  label: `Нотатки (${nCount})`,
                  children: (
                    <Space orientation="vertical" size="small" style={{ width: '100%' }}>
                      {nSorted.length ? (
                        nSorted.map((x) => (
                          <TrashRow
                            key={x.id}
                            title={x.title}
                            details={
                              <Space orientation="vertical" size={0}>
                                <Typography.Text type="secondary">Workspace: {x.workspaceTitle}</Typography.Text>
                                <Typography.Text type="secondary">Folder: {x.folderTitle ?? 'Без папки'}</Typography.Text>
                                <Typography.Text type="secondary">Власник: {x.ownerEmail}</Typography.Text>
                                {x.deletedAt ? (
                                  <Typography.Text type="secondary">
                                    Видалено: {new Date(x.deletedAt).toLocaleString()}
                                  </Typography.Text>
                                ) : null}
                              </Space>
                            }
                            onRestore={() => setConfirm({ kind: 'note', id: x.id, action: 'restore', title: x.title })}
                            onPurge={() => setConfirm({ kind: 'note', id: x.id, action: 'purge', title: x.title })}
                          />
                        ))
                      ) : (
                        <EmptyTrashList />
                      )}
                    </Space>
                  ),
                },
              ]}
            />
          )}
        </Card>
      </Space>

      <Modal
        open={!!confirm}
        title={confirm?.action === 'restore' ? 'Відновити?' : 'Видалити назавжди?'}
        okText={confirm?.action === 'restore' ? 'Відновити' : 'Видалити'}
        okButtonProps={{ danger: confirm?.action === 'purge' }}
        cancelText="Скасувати"
        onCancel={() => setConfirm(null)}
        onOk={doAction}
      >
        <Typography.Paragraph style={{ marginBottom: 0 }}>
          {confirm?.action === 'restore'
            ? `Відновити: ${confirm?.title}`
            : `Це видалить назавжди: ${confirm?.title}`}
        </Typography.Paragraph>
      </Modal>
    </div>
  )
}
