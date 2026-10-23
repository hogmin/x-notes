import { Entity, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core'
import { BaseSoftDeleteEntity } from './BaseSoftDeleteEntity'
import { Workspace } from './Workspace.entity'

@Entity({ tableName: 'folders' })
export class Folder extends BaseSoftDeleteEntity {
  @PrimaryKey({ fieldName: 'folder_id', type: 'number', autoincrement: true })
  id!: number

  @ManyToOne(() => Workspace, { fieldName: 'workspace_id' })
  workspaceId!: Workspace

  @Property({ columnType: 'nvarchar(255)' })
  title!: string
}
