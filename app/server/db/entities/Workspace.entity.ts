import { Entity, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core'
import { BaseSoftDeleteEntity } from './BaseSoftDeleteEntity'
import { User } from './User.entity'

@Entity({ tableName: 'workspaces' })
export class Workspace extends BaseSoftDeleteEntity {
  @PrimaryKey({ fieldName: 'workspace_id', type: 'number', autoincrement: true })
  id!: number

  @ManyToOne(() => User, { fieldName: 'user_id' })
  ownerId!: User

  @Property({ columnType: 'nvarchar(255)' })
  title!: string

  @Property({ fieldName: 'folder_count', type: 'number', nullable: true })
  folderCount?: number | null = null
}
