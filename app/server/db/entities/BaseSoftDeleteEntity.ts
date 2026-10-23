import { BaseEntity, Property, Index } from '@mikro-orm/core'

export abstract class BaseSoftDeleteEntity extends BaseEntity {
  @Property({ fieldName: 'created_at', columnType: 'datetime2(7)' })
  createdAt: Date = new Date()

  @Property({ fieldName: 'updated_at', columnType: 'datetime2(7)', nullable: true, onUpdate: () => new Date() })
  updatedAt?: Date | null = null

  @Index()
  @Property({ fieldName: 'deleted_at', columnType: 'datetime2(7)', nullable: true })
  deletedAt?: Date | null = null
}
