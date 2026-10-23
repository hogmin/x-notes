import { defineConfig } from '@mikro-orm/mssql'
import { User } from './app/server/db/entities/User.entity'
import { Workspace } from './app/server/db/entities/Workspace.entity'
import { Folder } from './app/server/db/entities/Folder.entity'
import { Note } from './app/server/db/entities/Note.entity'
import { Session } from "./app/server/db/entities/Session.entity"

export default defineConfig({
  host: process.env.SQLSERVER_SERVER ?? '(localdb)\\MSSQLLocalDB',
  dbName: process.env.SQLSERVER_DATABASE ?? 'xnotes-db',
  user: process.env.SQLSERVER_USER,
  password: process.env.SQLSERVER_PASSWORD,
  entities: [User, Workspace, Folder, Note, Session],
  driverOptions: {
    options: {
      trustServerCertificate: true,
      encrypt: false,
    },
  },
  migrations: {
    path: './migrations',
    emit: 'ts',
  },
  debug: false,
})
