export type NameConflictEntity = 'workspace' | 'folder' | 'note'

const duplicateNameMessages: Record<NameConflictEntity, string> = {
  workspace: 'Workspace з такою назвою вже існує у цього користувача.',
  folder: 'Папка з такою назвою вже існує в цьому workspace.',
  note: 'Нотатка з такою назвою вже існує в цій папці або серед нотаток без папки цього workspace.',
}

type SqlServerErrorLike = {
  number?: number
  code?: string | number
  message?: string
  originalError?: SqlServerErrorLike
  precedingErrors?: SqlServerErrorLike[]
}

export class DuplicateNameError extends Error {
  readonly code = 'duplicate_name'

  constructor(readonly entity: NameConflictEntity) {
    super(duplicateNameMessage(entity))
    this.name = 'DuplicateNameError'
  }
}

export function duplicateNameMessage(entity: NameConflictEntity) {
  return duplicateNameMessages[entity]
}

export function isDuplicateNameError(error: unknown): error is DuplicateNameError {
  return (
    error instanceof DuplicateNameError ||
    (typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: unknown }).code === 'duplicate_name')
  )
}

export function isSqlServerTriggerAbort(error: unknown) {
  return collectSqlErrorNumbers(error).includes(3609)
}

function collectSqlErrorNumbers(error: unknown): number[] {
  if (typeof error !== 'object' || error === null) return []

  const sqlError = error as SqlServerErrorLike
  const numbers = [
    typeof sqlError.number === 'number' ? sqlError.number : null,
    typeof sqlError.code === 'number' ? sqlError.code : null,
    ...collectSqlErrorNumbers(sqlError.originalError),
    ...(sqlError.precedingErrors ?? []).flatMap(collectSqlErrorNumbers),
  ]

  return numbers.filter((value): value is number => value !== null)
}
