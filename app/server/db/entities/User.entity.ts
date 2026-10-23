import { Entity, PrimaryKey, Property, Unique } from '@mikro-orm/core'
import { BaseSoftDeleteEntity } from './BaseSoftDeleteEntity'

@Entity({ tableName: 'users' })
export class User extends BaseSoftDeleteEntity {
  @PrimaryKey({ fieldName: 'user_id', type: 'number', autoincrement: true })
  id!: number

  @Property({ columnType: 'nvarchar(255)' })
  @Unique()
  email!: string

  @Property({ fieldName: 'password_hash', columnType: 'nvarchar(255)' })
  passwordHash!: string
}
