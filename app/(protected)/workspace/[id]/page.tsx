'use client'

import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Alert,
  Button,
  Card,
  Input,
  Layout,
  Tree,
  Modal,
  Space,
  Spin,
  Tabs,
  Typography,
} from 'antd'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'

import { useAppDispatch, useAppSelector } from '@/app/store/hooks'
import { deleteWorkspace, fetchWorkspaceById } from '@/app/store/slices/workspaces.slice'
import {
  createFolder,
  deleteFolder,
  fetchFolders,
  selectFoldersByWorkspace,
  updateFolder,
  clearFoldersError,
} from '@/app/store/slices/folders.slice'
import {
  clearNotesError,
  createNote,
  deleteNote,
  fetchNotes,
  selectNotesByWorkspace,
  updateNoteTitle,
  moveNote,
} from '@/app/store/slices/notes.slice'

import { getLocalNoteContent, upsertLocalNote } from '@/app/shared/notes/localNotes'
import styles from './Workspace.module.css'

const { Sider, Content } = Layout
const MIN_SIDEBAR_WIDTH = 280
const MAX_SIDEBAR_WIDTH = 560

export default function WorkspacePage() {
  const router = useRouter()
  const { id: workspaceId } = useParams<{ id: string }>()
  const dispatch = useAppDispatch()

  const userId = useAppSelector((s) => s.auth.user?.id) ?? null

  const workspace = useAppSelector((s) => s.workspaces.items.find((w) => w.id === workspaceId))

  const folders = useAppSelector((s) => selectFoldersByWorkspace(s, workspaceId))
  const foldersError = useAppSelector((s) => s.folders.error)

  const notes = useAppSelector((s) => selectNotesByWorkspace(s, workspaceId))
  const notesError = useAppSelector((s) => s.notes.error)

  const [activeNoteId, setActiveNoteId] = useState<string | null>(null)

  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({})
  const [sidebarWidth, setSidebarWidth] = useState(380)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [deleteWorkspaceOpen, setDeleteWorkspaceOpen] = useState(false)
  const [deleteWorkspaceError, setDeleteWorkspaceError] = useState<string | null>(null)
  const [deletingWorkspace, setDeletingWorkspace] = useState(false)
  const compactSidebar = sidebarWidth < 430

  const toggleFolder = (id: string) => {
    setOpenFolders((m) => ({ ...m, [id]: !m[id] }))
  }

  useEffect(() => {
    if (!isResizing) return

    const onMouseMove = (event: MouseEvent) => {
      const nextWidth = Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, event.clientX))
      setSidebarWidth(nextWidth)
    }

    const onMouseUp = () => setIsResizing(false)

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)

    return () => {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [isResizing])

  // створення папки
  const [createFolderOpen, setCreateFolderOpen] = useState(false)
  const [createFolderTitle, setCreateFolderTitle] = useState('')
  const [createFolderError, setCreateFolderError] = useState<string | null>(null)

  // редагування папки
  const [renameFolderOpen, setRenameFolderOpen] = useState(false)
  const [renameFolderId, setRenameFolderId] = useState<string | null>(null)
  const [renameFolderTitle, setRenameFolderTitle] = useState('')
  const [renameFolderError, setRenameFolderError] = useState<string | null>(null)

  // створення нотатки (і в папці, і без папки)
  const [createNoteOpen, setCreateNoteOpen] = useState(false)
  const [createNoteTitle, setCreateNoteTitle] = useState('Нова нотатка')
  const [createNoteContent, setCreateNoteContent] = useState('# Нова нотатка\n')
  const [createNoteFolderId, setCreateNoteFolderId] = useState<string | null>(null)
  const [createNoteError, setCreateNoteError] = useState<string | null>(null)

  // редагування назви нотатки
  const [renameNoteOpen, setRenameNoteOpen] = useState(false)
  const [renameNoteTitle, setRenameNoteTitle] = useState('')
  const [renameNoteError, setRenameNoteError] = useState<string | null>(null)

  // editor state
  const [content, setContent] = useState('')
  const saveTimer = useRef<number | null>(null)

  useEffect(() => {
    dispatch(fetchWorkspaceById({ id: workspaceId }))
    dispatch(fetchFolders({ workspaceId }))
  }, [dispatch, workspaceId])

  useEffect(() => {
    // важливо: тут мають підтягуватися ВСІ нотатки workspace
    dispatch(fetchNotes({ workspaceId }))
  }, [dispatch, workspaceId])

  const rootNotes = useMemo(() => notes.filter((n) => n.folderId === null), [notes])

  const notesByFolder = useMemo(() => {
    const m: Record<string, typeof notes> = {}
    for (const n of notes) {
      if (!n.folderId) continue
      ;(m[n.folderId] ??= []).push(n)
    }
    return m
  }, [notes])

  const activeNote = useMemo(() => notes.find((n) => n.id === activeNoteId) ?? null, [notes, activeNoteId])

  // DnD
  const onDragStartNote = (noteId: string) => (e: DragEvent) => {
    e.stopPropagation()
    e.dataTransfer.setData('text/plain', noteId)
    e.dataTransfer.setData('application/x-xnotes-note', noteId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const allowDrop = (e: DragEvent) => {
    if (!e.dataTransfer.types.includes('application/x-xnotes-note') && !e.dataTransfer.types.includes('text/plain')) {
      return
    }
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
  }

  const onDropToFolder = (folderId: string | null) => async (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const noteId = e.dataTransfer.getData('application/x-xnotes-note') || e.dataTransfer.getData('text/plain')
    if (!noteId) return

    await dispatch(moveNote({ id: noteId, workspaceId, folderId }))
  }

  // content load
  useEffect(() => {
    if (!userId || !activeNote) {
      setContent('')
      return
    }
    setContent(getLocalNoteContent(userId, activeNote.id))
  }, [userId, activeNote])

  // autosave content
  useEffect(() => {
    if (!userId || !activeNote) return

    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => {
      upsertLocalNote({
        noteId: activeNote.id,
        userId,
        workspaceId,
        folderId: activeNote.folderId,
        content,
        updatedAt: new Date().toISOString(),
      })
    }, 350)

    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current)
    }
  }, [content, userId, activeNote, workspaceId])

  if (!workspace) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <Layout className={styles.layout}>
      {!sidebarCollapsed && (
      <Sider width={sidebarWidth} className={styles.sider} data-compact={compactSidebar}>
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
          <div className={styles.sidebarHeader}>
            <Typography.Title level={4} className={styles.sidebarTitle}>
              {workspace.title}
            </Typography.Title>

            <div className={styles.sidebarActions}>
              <Button onClick={() => setSidebarCollapsed(true)}>Згорнути</Button>
              <Button onClick={() => router.push('/workspaces')}>← Назад</Button>
              <Button
                danger
                onClick={() => {
                  setDeleteWorkspaceError(null)
                  setDeleteWorkspaceOpen(true)
                }}
              >
                Видалити workspace
              </Button>
            </div>
          </div>

          {foldersError && (
            <Alert
              type="error"
              showIcon
              title={foldersError}
              action={
                <Button size="small" onClick={() => dispatch(clearFoldersError())}>
                  OK
                </Button>
              }
            />
          )}

          {notesError && (
            <Alert
              type="error"
              showIcon
              title={notesError}
              action={
                <Button size="small" onClick={() => dispatch(clearNotesError())}>
                  OK
                </Button>
              }
            />
          )}

          <div className={styles.sectionHeader}>
            <Typography.Text strong>Структура</Typography.Text>
            <div className={styles.sectionActions}>
              <Button
                onClick={() => {
                  setCreateNoteFolderId(null)
                  setCreateNoteError(null)
                  setCreateNoteOpen(true)
                }}
              >
                + Нотатка
              </Button>
              <Button type="primary" onClick={() => {
                setCreateFolderError(null)
                setCreateFolderOpen(true)
              }}>
                + Папка
              </Button>
            </div>
          </div>

          <div
            onDragOver={allowDrop}
            onDrop={onDropToFolder(null)}
            style={{ padding: 8, borderRadius: 6, border: '1px dashed rgba(0,0,0,0.15)' }}
          >
            <Typography.Text type="secondary">Без папки</Typography.Text>

          <Tree
            showLine
            blockNode
            treeData={rootNotes.map((n) => ({
              title: (
                <div
                  className={`${styles.itemRow} ${activeNoteId === n.id ? styles.activeItem : ''}`}
                  draggable
                  onDragStart={onDragStartNote(n.id)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveNoteId(n.id);
                  }}
                >
                  <span className={styles.itemTitle}>{n.title}</span>
                  <div className={styles.itemActions}>
                    <Button
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/notes/${n.id}`);
                      }}
                    >
                      Відкрити
                    </Button>
                    <Button
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveNoteId(n.id);
                        setRenameNoteTitle(n.title);
                        setRenameNoteError(null);
                        setRenameNoteOpen(true);
                      }}
                    >
                      Назва
                    </Button>
                    <Button
                      size="small"
                      danger
                      onClick={(e) => {
                        e.stopPropagation();
                        dispatch(deleteNote({ id: n.id, workspaceId }));
                        if (activeNoteId === n.id) {
                          setActiveNoteId(null);
                          setContent('');
                        }
                      }}
                    >
                      Видалити
                    </Button>
                  </div>
                </div>
              ),
              key: n.id,
              isLeaf: true,
            }))}
          />

          </div>

          <Typography.Text type="secondary">Папки</Typography.Text>

          <Tree
            showLine
            blockNode
            defaultExpandAll={false}
            expandedKeys={Object.keys(openFolders).filter((id) => openFolders[id])}
            onExpand={(expandedKeys) => {
              const open = new Set(expandedKeys.map(String));
              setOpenFolders(Object.fromEntries(folders.map((f) => [f.id, open.has(f.id)])));
            }}
            treeData={folders.map((f) => ({
              title: (
                <div
                  className={styles.itemRow}
                  onDragOver={allowDrop}
                  onDrop={onDropToFolder(f.id)}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFolder(f.id);
                  }}
                >
                  <span className={styles.itemTitle}>{f.title}</span>
                  <div className={styles.itemActions}>
                    <Button
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/folders/${f.id}`);
                      }}
                    >
                      Відкрити
                    </Button>
                    <Button
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCreateNoteFolderId(f.id);
                        setCreateNoteError(null);
                        setCreateNoteOpen(true);
                      }}
                    >
                      +
                    </Button>
                    <Button
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRenameFolderId(f.id);
                        setRenameFolderTitle(f.title);
                        setRenameFolderError(null);
                        setRenameFolderOpen(true);
                      }}
                    >
                      Назва
                    </Button>
                    <Button
                      size="small"
                      danger
                      onClick={(e) => {
                        e.stopPropagation();
                        dispatch(deleteFolder({ id: f.id, workspaceId }));
                        if (activeNote?.folderId === f.id) {
                          setActiveNoteId(null);
                          setContent('');
                        }
                      }}
                    >
                      Видалити
                    </Button>
                  </div>
                </div>
              ),
              key: f.id,
              children: notesByFolder[f.id]?.map((n) => ({
                title: (
                  <div
                    className={`${styles.itemRow} ${activeNoteId === n.id ? styles.activeItem : ''}`}
                    draggable
                    onDragStart={onDragStartNote(n.id)}
                    onDragOver={allowDrop}
                    onDrop={onDropToFolder(f.id)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveNoteId(n.id);
                    }}
                  >
                    <span className={styles.itemTitle}>{n.title}</span>
                    <div className={styles.itemActions}>
                      <Button
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/notes/${n.id}`);
                        }}
                      >
                        Відкрити
                      </Button>
                      <Button
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveNoteId(n.id);
                          setRenameNoteTitle(n.title);
                          setRenameNoteError(null);
                          setRenameNoteOpen(true);
                        }}
                      >
                        Назва
                      </Button>
                      <Button
                        size="small"
                        danger
                        onClick={(e) => {
                          e.stopPropagation();
                          dispatch(deleteNote({ id: n.id, workspaceId }));
                          if (activeNoteId === n.id) {
                            setActiveNoteId(null);
                            setContent('');
                          }
                        }}
                      >
                        Видалити
                      </Button>
                    </div>
                  </div>
                ),
                key: n.id,
                isLeaf: true,
              })),
            }))}
          />

          <Button
            onClick={() => {
              dispatch(fetchFolders({ workspaceId }))
              dispatch(fetchNotes({ workspaceId }))
            }}
          >
            Оновити
          </Button>
        </Space>
      </Sider>
      )}

      {!sidebarCollapsed && (
        <div
          className={styles.resizeHandle}
          role="separator"
          aria-orientation="vertical"
          aria-label="Змінити ширину меню"
          onMouseDown={() => setIsResizing(true)}
        />
      )}

      <Content className={styles.content}>
        {sidebarCollapsed && (
          <Button className={styles.expandButton} onClick={() => setSidebarCollapsed(false)}>
            Показати меню
          </Button>
        )}
        <Card style={{ height: '100%' }}>
          {!activeNote ? (
            <Typography.Paragraph type="secondary" style={{ marginTop: 8 }}>
              Обери нотатку зліва — праворуч відкриється редактор і превʼю.
            </Typography.Paragraph>
          ) : (
            <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                <Typography.Title level={4} style={{ margin: 0 }}>
                  {activeNote.title}
                </Typography.Title>

                <Button
                  onClick={() => {
                    setRenameNoteTitle(activeNote.title)
                    setRenameNoteError(null)
                    setRenameNoteOpen(true)
                  }}
                >
                  Перейменувати
                </Button>
              </Space>

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
                        autoSize={{ minRows: 16 }}
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

              <Typography.Text type="secondary">
                Збереження: автоматично (LocalStorage, тільки контент нотаток).
              </Typography.Text>
            </Space>
          )}
        </Card>
      </Content>

      <Modal
        open={createFolderOpen}
        title="Нова папка"
        okText="Створити"
        cancelText="Скасувати"
        onCancel={() => {
          setCreateFolderOpen(false)
          setCreateFolderTitle('')
          setCreateFolderError(null)
        }}
        onOk={async () => {
          const title = createFolderTitle.trim()
          if (!title) return

          setCreateFolderError(null)
          const res = await dispatch(createFolder({ workspaceId, title }))
          if (createFolder.fulfilled.match(res)) {
            setCreateFolderOpen(false)
            setCreateFolderTitle('')
            setCreateFolderError(null)
          } else if (createFolder.rejected.match(res)) {
            setCreateFolderError(res.payload ?? 'Не вдалося створити папку')
          }
        }}
      >
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
          {createFolderError && <Alert type="error" showIcon title={createFolderError} />}
          <Input
            placeholder="Назва папки"
            value={createFolderTitle}
            onChange={(e) => {
              setCreateFolderTitle(e.target.value)
              setCreateFolderError(null)
            }}
          />
        </Space>
      </Modal>

      <Modal
        open={renameFolderOpen}
        title="Змінити назву папки"
        okText="Зберегти"
        cancelText="Скасувати"
        onCancel={() => {
          setRenameFolderOpen(false)
          setRenameFolderId(null)
          setRenameFolderTitle('')
          setRenameFolderError(null)
        }}
        onOk={async () => {
          const id = renameFolderId
          const title = renameFolderTitle.trim()
          if (!id || !title) return

          setRenameFolderError(null)
          const res = await dispatch(updateFolder({ id, title }))
          if (updateFolder.fulfilled.match(res)) {
            setRenameFolderOpen(false)
            setRenameFolderId(null)
            setRenameFolderTitle('')
            setRenameFolderError(null)
          } else if (updateFolder.rejected.match(res)) {
            setRenameFolderError(res.payload ?? 'Не вдалося зберегти назву папки')
          }
        }}
      >
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
          {renameFolderError && <Alert type="error" showIcon title={renameFolderError} />}
          <Input
            placeholder="Назва"
            value={renameFolderTitle}
            onChange={(e) => {
              setRenameFolderTitle(e.target.value)
              setRenameFolderError(null)
            }}
          />
        </Space>
      </Modal>

      <Modal
        open={createNoteOpen}
        title={createNoteFolderId ? 'Нова нотатка в папці' : 'Нова нотатка без папки'}
        okText="Створити"
        cancelText="Скасувати"
        onCancel={() => {
          setCreateNoteOpen(false)
          setCreateNoteTitle('Нова нотатка')
          setCreateNoteContent('# Нова нотатка\n')
          setCreateNoteFolderId(null)
          setCreateNoteError(null)
        }}
        onOk={async () => {
          const title = createNoteTitle.trim()
          if (!title) return
          if (!userId) return

          setCreateNoteError(null)
          const res = await dispatch(
            createNote({
              workspaceId,
              folderId: createNoteFolderId,
              title,
              content: createNoteContent,
            })
          )

          if (createNote.fulfilled.match(res)) {
            setCreateNoteOpen(false)
            setCreateNoteTitle('Нова нотатка')
            setCreateNoteContent('# Нова нотатка\n')
            setCreateNoteFolderId(null)
            setCreateNoteError(null)
            setActiveNoteId(res.payload.id)
          } else if (createNote.rejected.match(res)) {
            setCreateNoteError(res.payload ?? 'Не вдалося створити нотатку')
          }
        }}
      >
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
          {createNoteError && <Alert type="error" showIcon title={createNoteError} />}
          <Input
            placeholder="Назва"
            value={createNoteTitle}
            onChange={(e) => {
              setCreateNoteTitle(e.target.value)
              setCreateNoteError(null)
            }}
          />
          <Input.TextArea
            placeholder="Markdown контент..."
            value={createNoteContent}
            onChange={(e) => setCreateNoteContent(e.target.value)}
            autoSize={{ minRows: 6 }}
          />
        </Space>
      </Modal>

      <Modal
        open={renameNoteOpen}
        title="Змінити назву нотатки"
        okText="Зберегти"
        cancelText="Скасувати"
        onCancel={() => {
          setRenameNoteOpen(false)
          setRenameNoteTitle('')
          setRenameNoteError(null)
        }}
        onOk={async () => {
          const id = activeNoteId
          const title = renameNoteTitle.trim()
          if (!id || !title) return

          setRenameNoteError(null)
          const res = await dispatch(updateNoteTitle({ id, workspaceId, title }))
          if (updateNoteTitle.fulfilled.match(res)) {
            setRenameNoteOpen(false)
            setRenameNoteTitle('')
            setRenameNoteError(null)
          } else if (updateNoteTitle.rejected.match(res)) {
            setRenameNoteError(res.payload ?? 'Не вдалося зберегти назву нотатки')
          }
        }}
      >
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
          {renameNoteError && <Alert type="error" showIcon title={renameNoteError} />}
          <Input
            placeholder="Назва"
            value={renameNoteTitle}
            onChange={(e) => {
              setRenameNoteTitle(e.target.value)
              setRenameNoteError(null)
            }}
          />
        </Space>
      </Modal>

      <Modal
        open={deleteWorkspaceOpen}
        title="Видалити workspace?"
        okText="Видалити"
        cancelText="Скасувати"
        okButtonProps={{ danger: true }}
        confirmLoading={deletingWorkspace}
        onCancel={() => {
          setDeleteWorkspaceOpen(false)
          setDeleteWorkspaceError(null)
        }}
        onOk={async () => {
          setDeletingWorkspace(true)
          setDeleteWorkspaceError(null)
          const res = await dispatch(deleteWorkspace({ id: workspaceId }))
          setDeletingWorkspace(false)

          if (deleteWorkspace.fulfilled.match(res)) {
            setDeleteWorkspaceOpen(false)
            router.push('/workspaces')
          } else if (deleteWorkspace.rejected.match(res)) {
            setDeleteWorkspaceError(res.payload ?? 'Не вдалося видалити workspace')
          }
        }}
      >
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
          {deleteWorkspaceError && <Alert type="error" showIcon title={deleteWorkspaceError} />}
          <Typography.Paragraph style={{ marginBottom: 0 }}>
            {`Workspace "${workspace.title}" буде переміщено до сміття разом із папками та нотатками.`}
          </Typography.Paragraph>
        </Space>
      </Modal>
    </Layout>
  )
}
