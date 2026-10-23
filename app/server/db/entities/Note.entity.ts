import { Entity, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core'
import { BaseSoftDeleteEntity } from './BaseSoftDeleteEntity'
import { User } from './User.entity'
import { Workspace } from './Workspace.entity'
import { Folder } from './Folder.entity'

@Entity({ tableName: 'notes' })
export class Note extends BaseSoftDeleteEntity {
  @PrimaryKey({ fieldName: 'note_id', type: 'number', autoincrement: true })
  id!: number

  @ManyToOne(() => User, { fieldName: 'user_id' })
  ownerId!: User

  @ManyToOne(() => Workspace, { fieldName: 'workspace_id' })
  workspaceId!: Workspace

  @ManyToOne(() => Folder, { fieldName: 'folder_id', nullable: true })
  folderId?: Folder | null = null

  @Property({ columnType: 'nvarchar(255)' })
  title!: string
}
