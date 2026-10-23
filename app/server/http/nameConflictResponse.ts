import { NextResponse } from 'next/server'
import {
  duplicateNameMessage,
  isDuplicateNameError,
  isSqlServerTriggerAbort,
  type NameConflictEntity,
} from '@/app/server/db/nameConflicts'

export function nameConflictResponse(entity: NameConflictEntity) {
  return NextResponse.json(
    {
      ok: false,
      code: 'duplicate_name',
      entity,
      message: duplicateNameMessage(entity),
    },
    { status: 409 }
  )
}

export function handleNameConflictError(error: unknown, fallbackEntity: NameConflictEntity) {
  if (isDuplicateNameError(error)) return nameConflictResponse(error.entity)
  if (isSqlServerTriggerAbort(error)) return nameConflictResponse(fallbackEntity)

  throw error
}
