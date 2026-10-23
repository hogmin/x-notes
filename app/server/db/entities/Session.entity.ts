import { Entity, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core'
import { User } from './User.entity'

@Entity({ tableName: 'sessions' })
export class Session {
  @PrimaryKey({ fieldName: 'session_id', type: 'number', autoincrement: true })
  id!: number

  @ManyToOne(() => User, { fieldName: 'user_id' })
  user!: User

  @Property({ fieldName: 'token_hash', columnType: 'nvarchar(255)' })
  tokenHash!: string

  @Property({ fieldName: 'created_at', columnType: 'datetime2(7)' })
  createdAt: Date = new Date()

  @Property({ fieldName: 'expires_at', columnType: 'datetime2(7)' })
  expiresAt!: Date
}
