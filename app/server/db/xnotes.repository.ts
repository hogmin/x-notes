import type { Transaction } from 'mssql/msnodesqlv8'
import { DuplicateNameError } from './nameConflicts'
import { sqlExecute, sqlQuery, withSqlTransaction } from './sqlServer'

type IdInput = number | string

export type UserRow = {
  id: number
  email: string
  passwordHash: string
  createdAt: Date
  updatedAt: Date | null
  deletedAt: Date | null
}

export type WorkspaceRow = {
  id: number
  ownerId: number
  title: string
  createdAt: Date
  updatedAt: Date | null
  deletedAt: Date | null
  folderCount: number | null
}

export type FolderRow = {
  id: number
  workspaceId: number
  title: string
  createdAt: Date
  updatedAt: Date | null
  deletedAt: Date | null
}

export type NoteRow = {
  id: number
  ownerId: number
  workspaceId: number
  folderId: number | null
  title: string
  createdAt: Date
  updatedAt: Date | null
  deletedAt: Date | null
}

export type NoteDetailRow = NoteRow & {
  workspaceTitle: string
  folderTitle: string | null
}

export type FolderDetailRow = FolderRow & {
  workspaceTitle: string
}

export type TrashWorkspaceRow = WorkspaceRow & {
  ownerEmail: string
}

export type TrashFolderRow = FolderRow & {
  workspaceTitle: string
  ownerEmail: string
}

export type TrashNoteRow = NoteRow & {
  workspaceTitle: string
  folderTitle: string | null
  ownerEmail: string
}

type TrashActionResult = 'ok' | 'not_found' | 'forbidden'

const userColumns = `
  [user_id] AS [id],
  [email],
  [password_hash] AS [passwordHash],
  [created_at] AS [createdAt],
  [updated_at] AS [updatedAt],
  [deleted_at] AS [deletedAt]
`

const workspaceColumns = `
  [workspace_id] AS [id],
  [user_id] AS [ownerId],
  [title],
  [created_at] AS [createdAt],
  [updated_at] AS [updatedAt],
  [deleted_at] AS [deletedAt],
  [folder_count] AS [folderCount]
`

const folderColumns = `
  [folder_id] AS [id],
  [workspace_id] AS [workspaceId],
  [title],
  [created_at] AS [createdAt],
  [updated_at] AS [updatedAt],
  [deleted_at] AS [deletedAt]
`

const noteColumns = `
  [note_id] AS [id],
  [user_id] AS [ownerId],
  [workspace_id] AS [workspaceId],
  [folder_id] AS [folderId],
  [title],
  [created_at] AS [createdAt],
  [updated_at] AS [updatedAt],
  [deleted_at] AS [deletedAt]
`

function first<T>(rows: T[]) {
  return rows[0] ?? null
}

function toId(value: IdInput) {
  const id = typeof value === 'number' ? value : Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

async function hasActiveWorkspaceTitleConflict(input: {
  ownerId: IdInput
  title: string
  excludeId?: IdInput
  transaction?: Transaction
}) {
  const excludePredicate = input.excludeId === undefined ? '' : 'AND [workspace_id] <> @excludeId'

  const rows = await sqlQuery<{ id: number }>(
    `
      SELECT TOP (1) [workspace_id] AS [id]
      FROM [workspaces]
      WHERE [user_id] = @ownerId
        AND [title] = @title
        AND [deleted_at] IS NULL
        ${excludePredicate}
    `,
    { ownerId: toId(input.ownerId), title: input.title, excludeId: input.excludeId === undefined ? null : toId(input.excludeId) },
    input.transaction
  )

  return rows.length > 0
}

async function hasActiveFolderTitleConflict(input: {
  workspaceId: IdInput
  title: string
  excludeId?: IdInput
  transaction?: Transaction
}) {
  const excludePredicate = input.excludeId === undefined ? '' : 'AND [folder_id] <> @excludeId'

  const rows = await sqlQuery<{ id: number }>(
    `
      SELECT TOP (1) [folder_id] AS [id]
      FROM [folders]
      WHERE [workspace_id] = @workspaceId
        AND [title] = @title
        AND [deleted_at] IS NULL
        ${excludePredicate}
    `,
    { workspaceId: toId(input.workspaceId), title: input.title, excludeId: input.excludeId === undefined ? null : toId(input.excludeId) },
    input.transaction
  )

  return rows.length > 0
}

async function hasActiveNoteTitleConflict(input: {
  workspaceId: IdInput
  folderId: IdInput | null
  title: string
  excludeId?: IdInput
  transaction?: Transaction
}) {
  const scopePredicate =
    input.folderId == null
      ? '[folder_id] IS NULL AND [workspace_id] = @workspaceId'
      : '[folder_id] = @folderId'
  const excludePredicate = input.excludeId === undefined ? '' : 'AND [note_id] <> @excludeId'

  const rows = await sqlQuery<{ id: number }>(
    `
      SELECT TOP (1) [note_id] AS [id]
      FROM [notes]
      WHERE ${scopePredicate}
        AND [title] = @title
        AND [deleted_at] IS NULL
        ${excludePredicate}
    `,
    {
      workspaceId: toId(input.workspaceId),
      folderId: input.folderId == null ? null : toId(input.folderId),
      title: input.title,
      excludeId: input.excludeId === undefined ? null : toId(input.excludeId),
    },
    input.transaction
  )

  return rows.length > 0
}

let notesReady: Promise<void> | null = null

async function ensureNotesTable(transaction?: Transaction) {
  const statement = `
    IF OBJECT_ID(N'[dbo].[notes]', N'U') IS NULL
    BEGIN
      CREATE TABLE [dbo].[notes] (
        [note_id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_notes] PRIMARY KEY,
        [user_id] int NOT NULL,
        [workspace_id] int NOT NULL,
        [folder_id] int NULL,
        [title] nvarchar(255) NOT NULL,
        [created_at] datetime2(7) NOT NULL,
        [updated_at] datetime2(7) NULL,
        [deleted_at] datetime2(7) NULL,
        CONSTRAINT [FK_notes_users] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([user_id]),
        CONSTRAINT [FK_notes_workspaces] FOREIGN KEY ([workspace_id]) REFERENCES [dbo].[workspaces]([workspace_id]),
        CONSTRAINT [FK_notes_folders] FOREIGN KEY ([folder_id]) REFERENCES [dbo].[folders]([folder_id])
      );

      CREATE INDEX [IX_notes_user_id] ON [dbo].[notes] ([user_id]);
      CREATE INDEX [IX_notes_workspace_id] ON [dbo].[notes] ([workspace_id]);
      CREATE INDEX [IX_notes_folder_id] ON [dbo].[notes] ([folder_id]);
      CREATE INDEX [IX_notes_deleted_at] ON [dbo].[notes] ([deleted_at]);
    END
  `

  if (transaction) {
    await sqlExecute(statement, {}, transaction)
    return
  }

  notesReady ??= sqlExecute(statement).then(() => undefined)
  await notesReady
}

export async function findUserByEmail(email: string, activeOnly = false) {
  return first(
    await sqlQuery<UserRow>(
      `
        SELECT TOP (1) ${userColumns}
        FROM [users]
        WHERE [email] = @email
        ${activeOnly ? 'AND [deleted_at] IS NULL' : ''}
      `,
      { email }
    )
  )
}

export async function findUserById(id: IdInput, activeOnly = false) {
  return first(
    await sqlQuery<UserRow>(
      `
        SELECT TOP (1) ${userColumns}
        FROM [users]
        WHERE [user_id] = @id
        ${activeOnly ? 'AND [deleted_at] IS NULL' : ''}
      `,
      { id: toId(id) }
    )
  )
}

export async function findUserBySessionTokenHash(tokenHash: string) {
  return first(
    await sqlQuery<Pick<UserRow, 'id' | 'email'>>(
      `
        SELECT TOP (1) u.[user_id] AS [id], u.[email]
        FROM [sessions] s
        INNER JOIN [users] u ON u.[user_id] = s.[user_id]
        WHERE s.[token_hash] = @tokenHash
          AND s.[expires_at] > @now
          AND u.[deleted_at] IS NULL
      `,
      { tokenHash, now: new Date() }
    )
  )
}

export async function createUserWithSession(input: {
  email: string
  passwordHash: string
  tokenHash: string
  expiresAt: Date
}) {
  const now = new Date()
  let userId = 0

  await withSqlTransaction(async (transaction) => {
    const users = await sqlQuery<{ id: number }>(
      `
        DECLARE @inserted TABLE ([id] int);

        INSERT INTO [users] ([email], [password_hash], [created_at], [updated_at], [deleted_at])
        OUTPUT INSERTED.[user_id] INTO @inserted([id])
        VALUES (@email, @passwordHash, @now, @now, NULL);

        SELECT [id] FROM @inserted;
      `,
      { now, email: input.email, passwordHash: input.passwordHash },
      transaction
    )
    userId = users[0].id

    await sqlExecute(
      `
        INSERT INTO [sessions] ([user_id], [token_hash], [created_at], [expires_at])
        VALUES (@userId, @tokenHash, @now, @expiresAt)
      `,
      {
        userId,
        tokenHash: input.tokenHash,
        now,
        expiresAt: input.expiresAt,
      },
      transaction
    )
  })

  return {
    id: userId,
    email: input.email,
    passwordHash: input.passwordHash,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  } satisfies UserRow
}

export async function createSession(input: { userId: IdInput; tokenHash: string; expiresAt: Date }) {
  const now = new Date()

  await sqlExecute(
    `
      INSERT INTO [sessions] ([user_id], [token_hash], [created_at], [expires_at])
      VALUES (@userId, @tokenHash, @now, @expiresAt)
    `,
    { userId: toId(input.userId), tokenHash: input.tokenHash, now, expiresAt: input.expiresAt }
  )
}

export async function deleteSessionByTokenHash(tokenHash: string) {
  await sqlExecute('DELETE FROM [sessions] WHERE [token_hash] = @tokenHash', { tokenHash })
}

export async function deleteSessionsByUserId(userId: IdInput, transaction?: Transaction) {
  await sqlExecute('DELETE FROM [sessions] WHERE [user_id] = @userId', { userId: toId(userId) }, transaction)
}

export async function updateUserEmail(id: IdInput, email: string) {
  const now = new Date()
  const affected = await sqlExecute(
    `
      UPDATE [users]
      SET [email] = @email, [updated_at] = @now
      WHERE [user_id] = @id AND [deleted_at] IS NULL
    `,
    { id: toId(id), email, now }
  )

  return affected ? findUserById(id, true) : null
}

export async function updateUserPasswordHash(id: IdInput, passwordHash: string) {
  const now = new Date()
  const affected = await sqlExecute(
    `
      UPDATE [users]
      SET [password_hash] = @passwordHash, [updated_at] = @now
      WHERE [user_id] = @id AND [deleted_at] IS NULL
    `,
    { id: toId(id), passwordHash, now }
  )

  return affected > 0
}

export async function softDeleteUserAccount(id: IdInput) {
  const userId = toId(id)
  const now = new Date()

  return withSqlTransaction(async (transaction) => {
    const affected = await sqlExecute(
      `
        UPDATE [users]
        SET [deleted_at] = @now, [updated_at] = @now
        WHERE [user_id] = @userId AND [deleted_at] IS NULL
      `,
      { userId, now },
      transaction
    )

    if (affected <= 0) return false

    await ensureNotesTable(transaction)
    await sqlExecute(
      `
        UPDATE [workspaces]
        SET [deleted_at] = @now, [updated_at] = @now
        WHERE [user_id] = @userId AND [deleted_at] IS NULL
      `,
      { userId, now },
      transaction
    )
    await sqlExecute(
      `
        UPDATE f
        SET f.[deleted_at] = @now, f.[updated_at] = @now
        FROM [folders] f
        INNER JOIN [workspaces] w ON w.[workspace_id] = f.[workspace_id]
        WHERE w.[user_id] = @userId AND f.[deleted_at] IS NULL
      `,
      { userId, now },
      transaction
    )
    await sqlExecute(
      `
        UPDATE [notes]
        SET [deleted_at] = @now, [updated_at] = @now
        WHERE [user_id] = @userId AND [deleted_at] IS NULL
      `,
      { userId, now },
      transaction
    )
    await deleteSessionsByUserId(userId ?? 0, transaction)

    return true
  })
}

export async function listWorkspacesByOwner(ownerId: IdInput) {
  return sqlQuery<WorkspaceRow>(
    `
      SELECT ${workspaceColumns}
      FROM [workspaces]
      WHERE [user_id] = @ownerId AND [deleted_at] IS NULL
      ORDER BY [created_at] DESC
    `,
    { ownerId: toId(ownerId) }
  )
}

export async function findActiveWorkspace(id: IdInput) {
  return first(
    await sqlQuery<WorkspaceRow>(
      `
        SELECT TOP (1) ${workspaceColumns}
        FROM [workspaces]
        WHERE [workspace_id] = @id AND [deleted_at] IS NULL
      `,
      { id: toId(id) }
    )
  )
}

export async function findActiveWorkspaceForOwner(id: IdInput, ownerId: IdInput, transaction?: Transaction) {
  return first(
    await sqlQuery<WorkspaceRow>(
      `
        SELECT TOP (1) ${workspaceColumns}
        FROM [workspaces]
        WHERE [workspace_id] = @id
          AND [user_id] = @ownerId
          AND [deleted_at] IS NULL
      `,
      { id: toId(id), ownerId: toId(ownerId) },
      transaction
    )
  )
}

export async function findWorkspaceForOwner(id: IdInput, ownerId: IdInput, transaction?: Transaction) {
  return first(
    await sqlQuery<WorkspaceRow>(
      `
        SELECT TOP (1) ${workspaceColumns}
        FROM [workspaces]
        WHERE [workspace_id] = @id AND [user_id] = @ownerId
      `,
      { id: toId(id), ownerId: toId(ownerId) },
      transaction
    )
  )
}

export async function createWorkspace(ownerId: IdInput, title: string) {
  const now = new Date()
  const owner = toId(ownerId)

  if (await hasActiveWorkspaceTitleConflict({ ownerId, title })) {
    throw new DuplicateNameError('workspace')
  }

  const rows = await sqlQuery<{ id: number }>(
    `
      DECLARE @inserted TABLE ([id] int);

      INSERT INTO [workspaces] ([user_id], [title], [created_at], [updated_at], [deleted_at], [folder_count])
      OUTPUT INSERTED.[workspace_id] INTO @inserted([id])
      VALUES (@ownerId, @title, @now, @now, NULL, 0);

      SELECT [id] FROM @inserted;
    `,
    { now, ownerId: owner, title }
  )

  const id = rows[0].id
  return { id, ownerId: owner ?? 0, title, createdAt: now, updatedAt: now, deletedAt: null, folderCount: 0 } satisfies WorkspaceRow
}

export async function updateWorkspaceTitle(id: IdInput, title: string, ownerId?: IdInput) {
  const existing = ownerId === undefined ? await findActiveWorkspace(id) : await findActiveWorkspaceForOwner(id, ownerId)
  if (!existing) return null

  if (await hasActiveWorkspaceTitleConflict({ ownerId: existing.ownerId, title, excludeId: id })) {
    throw new DuplicateNameError('workspace')
  }

  const now = new Date()
  const ownerPredicate = ownerId === undefined ? '' : 'AND [user_id] = @ownerId'
  const affected = await sqlExecute(
    `
      UPDATE [workspaces]
      SET [title] = @title, [updated_at] = @now
      WHERE [workspace_id] = @id AND [deleted_at] IS NULL
      ${ownerPredicate}
    `,
    { id: toId(id), title, now, ownerId: ownerId === undefined ? null : toId(ownerId) }
  )

  return affected ? ownerId === undefined ? findActiveWorkspace(id) : findActiveWorkspaceForOwner(id, ownerId) : null
}

export async function softDeleteWorkspaceTree(id: IdInput, ownerId?: IdInput) {
  const workspaceId = toId(id)

  return withSqlTransaction(async (transaction) => {
    const ownerPredicate = ownerId === undefined ? '' : 'AND [user_id] = @ownerId'
    const workspace = first(
      await sqlQuery<WorkspaceRow>(
        `
          SELECT TOP (1) ${workspaceColumns}
          FROM [workspaces]
          WHERE [workspace_id] = @id AND [deleted_at] IS NULL
          ${ownerPredicate}
        `,
        { id: workspaceId, ownerId: ownerId === undefined ? null : toId(ownerId) },
        transaction
      )
    )
    if (!workspace) return false

    const now = new Date()
    await ensureNotesTable(transaction)
    await sqlExecute(
      'UPDATE [workspaces] SET [deleted_at] = @now, [updated_at] = @now WHERE [workspace_id] = @id',
      { id: workspaceId, now },
      transaction
    )
    await sqlExecute(
      'UPDATE [folders] SET [deleted_at] = @now, [updated_at] = @now WHERE [workspace_id] = @id AND [deleted_at] IS NULL',
      { id: workspaceId, now },
      transaction
    )
    await sqlExecute(
      'UPDATE [notes] SET [deleted_at] = @now, [updated_at] = @now WHERE [workspace_id] = @id AND [deleted_at] IS NULL',
      { id: workspaceId, now },
      transaction
    )

    return true
  })
}

export async function listFoldersByWorkspace(workspaceId: IdInput) {
  return sqlQuery<FolderRow>(
    `
      SELECT ${folderColumns}
      FROM [folders]
      WHERE [workspace_id] = @workspaceId AND [deleted_at] IS NULL
      ORDER BY [created_at] DESC
    `,
    { workspaceId: toId(workspaceId) }
  )
}

export async function findFolder(id: IdInput, transaction?: Transaction) {
  return first(
    await sqlQuery<FolderRow>(
      `
        SELECT TOP (1) ${folderColumns}
        FROM [folders]
        WHERE [folder_id] = @id
      `,
      { id: toId(id) },
      transaction
    )
  )
}

export async function findActiveFolder(id: IdInput) {
  return first(
    await sqlQuery<FolderRow>(
      `
        SELECT TOP (1) ${folderColumns}
        FROM [folders]
        WHERE [folder_id] = @id AND [deleted_at] IS NULL
      `,
      { id: toId(id) }
    )
  )
}

export async function findActiveFolderDetail(id: IdInput, ownerId: IdInput) {
  return first(
    await sqlQuery<FolderDetailRow>(
      `
        SELECT TOP (1)
          f.[folder_id] AS [id],
          f.[workspace_id] AS [workspaceId],
          f.[title],
          f.[created_at] AS [createdAt],
          f.[updated_at] AS [updatedAt],
          f.[deleted_at] AS [deletedAt],
          w.[title] AS [workspaceTitle]
        FROM [folders] f
        INNER JOIN [workspaces] w ON w.[workspace_id] = f.[workspace_id]
        WHERE f.[folder_id] = @id
          AND f.[deleted_at] IS NULL
          AND w.[user_id] = @ownerId
          AND w.[deleted_at] IS NULL
      `,
      { id: toId(id), ownerId: toId(ownerId) }
    )
  )
}

export async function createFolder(workspaceId: IdInput, title: string) {
  const now = new Date()
  const workspace = toId(workspaceId)

  if (await hasActiveFolderTitleConflict({ workspaceId, title })) {
    throw new DuplicateNameError('folder')
  }

  const rows = await withSqlTransaction(async (transaction) => {
    const inserted = await sqlQuery<{ id: number }>(
      `
        DECLARE @inserted TABLE ([id] int);

        INSERT INTO [folders] ([workspace_id], [title], [created_at], [updated_at], [deleted_at])
        OUTPUT INSERTED.[folder_id] INTO @inserted([id])
        VALUES (@workspaceId, @title, @now, @now, NULL);

        SELECT [id] FROM @inserted;
      `,
      { now, workspaceId: workspace, title },
      transaction
    )

    await sqlExecute(
      `
        UPDATE [workspaces]
        SET [folder_count] = ISNULL([folder_count], 0) + 1, [updated_at] = @now
        WHERE [workspace_id] = @workspaceId
      `,
      { workspaceId: workspace, now },
      transaction
    )

    return inserted
  })

  const id = rows[0].id
  return { id, workspaceId: workspace ?? 0, title, createdAt: now, updatedAt: now, deletedAt: null } satisfies FolderRow
}

export async function updateFolderTitle(id: IdInput, title: string) {
  const existing = await findActiveFolder(id)
  if (!existing) return null

  if (await hasActiveFolderTitleConflict({ workspaceId: existing.workspaceId, title, excludeId: id })) {
    throw new DuplicateNameError('folder')
  }

  const now = new Date()
  const affected = await sqlExecute(
    `
      UPDATE [folders]
      SET [title] = @title, [updated_at] = @now
      WHERE [folder_id] = @id AND [deleted_at] IS NULL
    `,
    { id: toId(id), title, now }
  )

  return affected ? findActiveFolder(id) : null
}

export async function softDeleteFolder(id: IdInput) {
  const now = new Date()
  const folder = await findActiveFolder(id)
  if (!folder) return false

  return withSqlTransaction(async (transaction) => {
    await ensureNotesTable(transaction)

    const affected = await sqlExecute(
      `
        UPDATE [folders]
        SET [deleted_at] = @now, [updated_at] = @now
        WHERE [folder_id] = @id AND [deleted_at] IS NULL
      `,
      { id: toId(id), now },
      transaction
    )

    if (affected > 0) {
      await sqlExecute(
        `
          UPDATE [notes]
          SET [deleted_at] = @now, [updated_at] = @now
          WHERE [folder_id] = @id AND [deleted_at] IS NULL
        `,
        { id: toId(id), now },
        transaction
      )

      await sqlExecute(
        `
          UPDATE [workspaces]
          SET [folder_count] = CASE WHEN ISNULL([folder_count], 0) > 0 THEN ISNULL([folder_count], 0) - 1 ELSE 0 END,
              [updated_at] = @now
          WHERE [workspace_id] = @workspaceId
        `,
        { workspaceId: folder.workspaceId, now },
        transaction
      )
    }

    return affected > 0
  })
}

export async function listNotes(input: { ownerId: IdInput; workspaceId: IdInput; folderId?: IdInput | null }) {
  await ensureNotesTable()

  const folderPredicate =
    input.folderId === undefined
      ? ''
      : input.folderId === null
        ? 'AND [folder_id] IS NULL'
        : 'AND [folder_id] = @folderId'

  return sqlQuery<NoteRow>(
    `
      SELECT ${noteColumns}
      FROM [notes]
      WHERE [user_id] = @ownerId
        AND [workspace_id] = @workspaceId
        AND [deleted_at] IS NULL
        ${folderPredicate}
      ORDER BY COALESCE([updated_at], [created_at]) DESC
    `,
    { ownerId: toId(input.ownerId), workspaceId: toId(input.workspaceId), folderId: input.folderId == null ? null : toId(input.folderId) }
  )
}

export async function findNote(id: IdInput, transaction?: Transaction) {
  await ensureNotesTable(transaction)

  return first(
    await sqlQuery<NoteRow>(
      `
        SELECT TOP (1) ${noteColumns}
        FROM [notes]
        WHERE [note_id] = @id
      `,
      { id: toId(id) },
      transaction
    )
  )
}

export async function findActiveNote(id: IdInput) {
  await ensureNotesTable()

  return first(
    await sqlQuery<NoteRow>(
      `
        SELECT TOP (1) ${noteColumns}
        FROM [notes]
        WHERE [note_id] = @id AND [deleted_at] IS NULL
      `,
      { id: toId(id) }
    )
  )
}

export async function findActiveNoteDetail(id: IdInput, ownerId: IdInput) {
  await ensureNotesTable()

  return first(
    await sqlQuery<NoteDetailRow>(
      `
        SELECT TOP (1)
          n.[note_id] AS [id],
          n.[user_id] AS [ownerId],
          n.[workspace_id] AS [workspaceId],
          n.[folder_id] AS [folderId],
          n.[title],
          n.[created_at] AS [createdAt],
          n.[updated_at] AS [updatedAt],
          n.[deleted_at] AS [deletedAt],
          w.[title] AS [workspaceTitle],
          f.[title] AS [folderTitle]
        FROM [notes] n
        INNER JOIN [workspaces] w ON w.[workspace_id] = n.[workspace_id]
        LEFT JOIN [folders] f ON f.[folder_id] = n.[folder_id]
        WHERE n.[note_id] = @id
          AND n.[user_id] = @ownerId
          AND n.[deleted_at] IS NULL
          AND w.[deleted_at] IS NULL
      `,
      { id: toId(id), ownerId: toId(ownerId) }
    )
  )
}

export async function createNote(input: {
  ownerId: IdInput
  workspaceId: IdInput
  folderId: IdInput | null
  title: string
}) {
  await ensureNotesTable()

  const now = new Date()

  const owner = toId(input.ownerId)
  const workspace = toId(input.workspaceId)
  const folder = input.folderId == null ? null : toId(input.folderId)

  if (await hasActiveNoteTitleConflict({ workspaceId: input.workspaceId, folderId: input.folderId, title: input.title })) {
    throw new DuplicateNameError('note')
  }

  const rows = await sqlQuery<{ id: number }>(
    `
      DECLARE @inserted TABLE ([id] int);

      INSERT INTO [notes] (
        [user_id], [workspace_id], [folder_id], [title], [created_at], [updated_at], [deleted_at]
      )
      OUTPUT INSERTED.[note_id] INTO @inserted([id])
      VALUES (@ownerId, @workspaceId, @folderId, @title, @now, @now, NULL);

      SELECT [id] FROM @inserted;
    `,
    { now, ownerId: owner, workspaceId: workspace, folderId: folder, title: input.title }
  )

  const id = rows[0].id
  return {
    id,
    ownerId: owner ?? 0,
    workspaceId: workspace ?? 0,
    folderId: folder,
    title: input.title,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  } satisfies NoteRow
}

export async function updateNote(input: { id: IdInput; title?: string; folderId?: IdInput | null }) {
  const existing = await findActiveNote(input.id)
  if (!existing) return null

  const title = input.title ?? existing.title
  const folderId = input.folderId === undefined ? existing.folderId : input.folderId === null ? null : toId(input.folderId)

  if (
    await hasActiveNoteTitleConflict({
      workspaceId: existing.workspaceId,
      folderId,
      title,
      excludeId: input.id,
    })
  ) {
    throw new DuplicateNameError('note')
  }

  const now = new Date()

  await sqlExecute(
    `
      UPDATE [notes]
      SET [title] = @title, [folder_id] = @folderId, [updated_at] = @now
      WHERE [note_id] = @id AND [deleted_at] IS NULL
    `,
    { id: toId(input.id), title, folderId, now }
  )

  return {
    ...existing,
    title,
    folderId,
    updatedAt: now,
  } satisfies NoteRow
}

export async function softDeleteNote(id: IdInput) {
  await ensureNotesTable()

  const now = new Date()
  return (
    (await sqlExecute(
      `
        UPDATE [notes]
        SET [deleted_at] = @now, [updated_at] = @now
        WHERE [note_id] = @id AND [deleted_at] IS NULL
      `,
      { id: toId(id), now }
    )) > 0
  )
}

export async function listTrash(ownerId: IdInput) {
  await ensureNotesTable()

  const workspaces = await sqlQuery<TrashWorkspaceRow>(
    `
      SELECT w.[workspace_id] AS [id],
             w.[user_id] AS [ownerId],
             w.[title],
             w.[created_at] AS [createdAt],
             w.[updated_at] AS [updatedAt],
             w.[deleted_at] AS [deletedAt],
             w.[folder_count] AS [folderCount],
             u.[email] AS [ownerEmail]
      FROM [workspaces] w
      INNER JOIN [users] u ON u.[user_id] = w.[user_id]
      WHERE w.[user_id] = @ownerId AND w.[deleted_at] IS NOT NULL
      ORDER BY w.[deleted_at] DESC
    `,
    { ownerId: toId(ownerId) }
  )

  const folders = await sqlQuery<TrashFolderRow>(
    `
      SELECT f.[folder_id] AS [id],
             f.[workspace_id] AS [workspaceId],
             f.[title],
             f.[created_at] AS [createdAt],
             f.[updated_at] AS [updatedAt],
             f.[deleted_at] AS [deletedAt],
             w.[title] AS [workspaceTitle],
             u.[email] AS [ownerEmail]
      FROM [folders] f
      INNER JOIN [workspaces] w ON w.[workspace_id] = f.[workspace_id]
      INNER JOIN [users] u ON u.[user_id] = w.[user_id]
      WHERE w.[user_id] = @ownerId AND f.[deleted_at] IS NOT NULL
      ORDER BY f.[deleted_at] DESC
    `,
    { ownerId: toId(ownerId) }
  )

  const notes = await sqlQuery<TrashNoteRow>(
    `
      SELECT n.[note_id] AS [id],
             n.[user_id] AS [ownerId],
             n.[workspace_id] AS [workspaceId],
             n.[folder_id] AS [folderId],
             n.[title],
             n.[created_at] AS [createdAt],
             n.[updated_at] AS [updatedAt],
             n.[deleted_at] AS [deletedAt],
             w.[title] AS [workspaceTitle],
             f.[title] AS [folderTitle],
             u.[email] AS [ownerEmail]
      FROM [notes] n
      INNER JOIN [workspaces] w ON w.[workspace_id] = n.[workspace_id]
      INNER JOIN [users] u ON u.[user_id] = n.[user_id]
      LEFT JOIN [folders] f ON f.[folder_id] = n.[folder_id]
      WHERE n.[user_id] = @ownerId AND n.[deleted_at] IS NOT NULL
      ORDER BY n.[deleted_at] DESC
    `,
    { ownerId: toId(ownerId) }
  )

  return { workspaces, folders, notes }
}

export async function restoreWorkspaceTree(id: IdInput, ownerId: IdInput) {
  return withSqlTransaction(async (transaction) => {
    const workspace = await findWorkspaceForOwner(id, ownerId, transaction)
    if (!workspace) return false

    const now = new Date()
    await ensureNotesTable(transaction)
    await sqlExecute(
      'UPDATE [workspaces] SET [deleted_at] = NULL, [updated_at] = @now WHERE [workspace_id] = @id',
      { id: toId(id), now },
      transaction
    )
    await sqlExecute(
      'UPDATE [folders] SET [deleted_at] = NULL, [updated_at] = @now WHERE [workspace_id] = @id',
      { id: toId(id), now },
      transaction
    )
    await sqlExecute(
      'UPDATE [notes] SET [deleted_at] = NULL, [updated_at] = @now WHERE [workspace_id] = @id',
      { id: toId(id), now },
      transaction
    )
    await sqlExecute(
      `
        UPDATE [workspaces]
        SET [folder_count] = (
          SELECT COUNT(*)
          FROM [folders]
          WHERE [workspace_id] = @id AND [deleted_at] IS NULL
        )
        WHERE [workspace_id] = @id
      `,
      { id: toId(id) },
      transaction
    )

    return true
  })
}

export async function purgeWorkspaceTree(id: IdInput, ownerId: IdInput) {
  return withSqlTransaction(async (transaction) => {
    const workspace = await findWorkspaceForOwner(id, ownerId, transaction)
    if (!workspace) return false

    await ensureNotesTable(transaction)
    await sqlExecute('DELETE FROM [notes] WHERE [workspace_id] = @id', { id: toId(id) }, transaction)
    await sqlExecute('DELETE FROM [folders] WHERE [workspace_id] = @id', { id: toId(id) }, transaction)
    await sqlExecute('DELETE FROM [workspaces] WHERE [workspace_id] = @id', { id: toId(id) }, transaction)

    return true
  })
}

export async function restoreFolderTree(id: IdInput, ownerId: IdInput): Promise<TrashActionResult> {
  return withSqlTransaction(async (transaction) => {
    const folder = await findFolder(id, transaction)
    if (!folder) return 'not_found'

    const workspace = await findWorkspaceForOwner(folder.workspaceId, ownerId, transaction)
    if (!workspace) return 'forbidden'

    const now = new Date()
    await ensureNotesTable(transaction)
    await sqlExecute(
      'UPDATE [folders] SET [deleted_at] = NULL, [updated_at] = @now WHERE [folder_id] = @id',
      { id: toId(id), now },
      transaction
    )
    await sqlExecute(
      'UPDATE [notes] SET [deleted_at] = NULL, [updated_at] = @now WHERE [folder_id] = @id',
      { id: toId(id), now },
      transaction
    )
    await sqlExecute(
      `
        UPDATE [workspaces]
        SET [folder_count] = ISNULL([folder_count], 0) + 1, [updated_at] = @now
        WHERE [workspace_id] = @workspaceId
      `,
      { workspaceId: folder.workspaceId, now },
      transaction
    )

    return 'ok'
  })
}

export async function purgeFolderTree(id: IdInput, ownerId: IdInput): Promise<TrashActionResult> {
  return withSqlTransaction(async (transaction) => {
    const folder = await findFolder(id, transaction)
    if (!folder) return 'not_found'

    const workspace = await findWorkspaceForOwner(folder.workspaceId, ownerId, transaction)
    if (!workspace) return 'forbidden'

    await ensureNotesTable(transaction)
    await sqlExecute('DELETE FROM [notes] WHERE [folder_id] = @id', { id: toId(id) }, transaction)
    await sqlExecute('DELETE FROM [folders] WHERE [folder_id] = @id', { id: toId(id) }, transaction)

    return 'ok'
  })
}

export async function restoreNote(id: IdInput, ownerId: IdInput): Promise<TrashActionResult> {
  return withSqlTransaction(async (transaction) => {
    const note = await findNote(id, transaction)
    if (!note) return 'not_found'

    const workspace = await findWorkspaceForOwner(note.workspaceId, ownerId, transaction)
    if (!workspace) return 'forbidden'

    const now = new Date()
    await sqlExecute(
      'UPDATE [notes] SET [deleted_at] = NULL, [updated_at] = @now WHERE [note_id] = @id',
      { id: toId(id), now },
      transaction
    )

    return 'ok'
  })
}

export async function purgeNote(id: IdInput, ownerId: IdInput): Promise<TrashActionResult> {
  return withSqlTransaction(async (transaction) => {
    const note = await findNote(id, transaction)
    if (!note) return 'not_found'

    const workspace = await findWorkspaceForOwner(note.workspaceId, ownerId, transaction)
    if (!workspace) return 'forbidden'

    await sqlExecute('DELETE FROM [notes] WHERE [note_id] = @id', { id: toId(id) }, transaction)
    return 'ok'
  })
}
