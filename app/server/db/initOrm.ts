import { MikroORM } from '@mikro-orm/mssql'
import config from '../../../mikro-orm.config'

let ormPromise: Promise<MikroORM> | null = null

export function getOrm() {
  if (!ormPromise) {
    ormPromise = MikroORM.init(config)
  }
  return ormPromise
}
