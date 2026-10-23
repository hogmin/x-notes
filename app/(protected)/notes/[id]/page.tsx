'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Alert, Button, Card, Input, Space, Spin, Tabs, Typography } from 'antd'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'
import { useAppSelector } from '@/app/store/hooks'
import { getLocalNoteContent, upsertLocalNote } from '@/app/shared/notes/localNotes'
import styles from './NotePage.module.css'

type NoteDetail = {
  id: string
  title: string
  workspaceId: string
  workspaceTitle: string
  folderId: string | null
  folderTitle: string | null
  updatedAt: string | null
}

type NoteDetailResponse = { ok: true; item: NoteDetail } | { ok: false; message?: string }
type NoteUpdateResponse =
  | { ok: true; item: { title: string; updatedAt: string | null } }
  | { ok: false; message?: string }

export default function NotePage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const userId = useAppSelector((s) => s.auth.user?.id) ?? null
  const saveTimer = useRef<number | null>(null)

  const [note, setNote] = useState<NoteDetail | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingTitle, setSavingTitle] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadNote() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/notes/${encodeURIComponent(id)}`)
        const data = (await res.json()) as NoteDetailResponse

        if (!res.ok || !data.ok) {
          const message = data.ok ? 'Не вдалося завантажити нотатку' : data.message ?? 'Не вдалося завантажити нотатку'
          if (!cancelled) setError(message)
          return
        }

        if (!cancelled) {
          setNote(data.item)
          setTitle(data.item.title)
        }
      } catch {
        if (!cancelled) setError('Не вдалося підключитися до сервера')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadNote()

    return () => {
      cancelled = true
    }
  }, [id])

  useEffect(() => {
    if (!userId || !note) {
      setContent('')
      return
    }
    setContent(getLocalNoteContent(userId, note.id))
  }, [userId, note])

  useEffect(() => {
    if (!userId || !note) return

    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => {
      upsertLocalNote({
        noteId: note.id,
        userId,
        workspaceId: note.workspaceId,
        folderId: note.folderId,
        content,
        updatedAt: new Date().toISOString(),
      })
    }, 350)

    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current)
    }
  }, [content, userId, note])

  const saveTitle = async () => {
    const nextTitle = title.trim()
    if (!note || !nextTitle) return

    setSavingTitle(true)
    setMessage(null)
    setError(null)
    try {
      const res = await fetch(`/api/notes/${encodeURIComponent(note.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: nextTitle }),
      })
      const data = (await res.json()) as NoteUpdateResponse

      if (!res.ok || !data.ok) {
        setError(data.ok ? 'Не вдалося зберегти назву' : data.message ?? 'Не вдалося зберегти назву')
        return
      }

      setNote({ ...note, title: data.item.title, updatedAt: data.item.updatedAt })
      setTitle(data.item.title)
      setMessage('Назву збережено')
    } catch {
      setError('Не вдалося підключитися до сервера')
    } finally {
      setSavingTitle(false)
    }
  }

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

  if (error && !note) {
    return (
      <div className={styles.page}>
        <div className={styles.shell}>
          <Alert type="error" showIcon title={error} />
        </div>
      </div>
    )
  }

  if (!note) return null

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <Space orientation="vertical" size="middle" className={styles.full}>
          {error && <Alert type="error" showIcon title={error} closable onClose={() => setError(null)} />}
          {message && <Alert type="success" showIcon title={message} closable onClose={() => setMessage(null)} />}

          <Card>
            <Space orientation="vertical" size="middle" className={styles.full}>
              <Space style={{ width: '100%', justifyContent: 'space-between' }} align="start">
                <div>
                  <Typography.Title level={3} style={{ margin: 0 }}>
                    {note.title}
                  </Typography.Title>
                  <Typography.Text className={styles.meta}>
                    Workspace: {note.workspaceTitle}
                    {note.folderTitle ? ` / Folder: ${note.folderTitle}` : ''}
                  </Typography.Text>
                </div>

                <Space>
                  {note.folderId && (
                    <Button onClick={() => router.push(`/folders/${note.folderId}`)}>Папка</Button>
                  )}
                  <Button onClick={() => router.push(`/workspace/${note.workspaceId}`)}>Workspace</Button>
                </Space>
              </Space>

              <Space.Compact className={styles.full}>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Назва нотатки" />
                <Button type="primary" loading={savingTitle} onClick={saveTitle}>
                  Зберегти назву
                </Button>
              </Space.Compact>

              <Tabs
                defaultActiveKey="edit"
                items={[
                  {
                    key: 'edit',
                    label: 'Редактор',
                    children: (
                      <Input.TextArea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        autoSize={{ minRows: 18 }}
                        placeholder="Markdown..."
                      />
                    ),
                  },
                  {
                    key: 'preview',
                    label: 'Превʼю',
                    children: (
                      <div className={styles.mdPreview}>
                        {content.trim() ? (
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeSanitize]}
                            components={{
                              a: ({ href, children, ...props }) => (
                                <a href={href} target="_blank" rel="noreferrer" {...props}>
                                  {children}
                                </a>
                              ),
                            }}
                          >
                            {content}
                          </ReactMarkdown>
                        ) : (
                          <Typography.Text type="secondary">Немає контенту для превʼю</Typography.Text>
                        )}
                      </div>
                    ),
                  },
                ]}
              />
            </Space>
          </Card>
        </Space>
      </div>
    </div>
  )
}
