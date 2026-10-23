import sql from 'mssql/msnodesqlv8'
import type { ConnectionPool, Request, Transaction, config as SqlConfig } from 'mssql/msnodesqlv8'

type SqlParamValue = string | number | boolean | Date | null | undefined
type SqlParams = Record<string, SqlParamValue>

let poolPromise: Promise<ConnectionPool> | null = null

function parseServerName(serverName: string) {
  const slashIndex = serverName.indexOf('\\')
  if (slashIndex === -1) return { server: serverName, instanceName: undefined }

  return {
    server: serverName.slice(0, slashIndex),
    instanceName: serverName.slice(slashIndex + 1),
  }
}

function getSqlConfig(): SqlConfig | string {
  if (process.env.SQLSERVER_CONNECTION_STRING) {
    return {
      server: '',
      connectionString: process.env.SQLSERVER_CONNECTION_STRING,
    } as SqlConfig
  }

  const user = process.env.SQLSERVER_USER
  const password = process.env.SQLSERVER_PASSWORD
  const { server, instanceName } = parseServerName(process.env.SQLSERVER_SERVER ?? '(localdb)\\MSSQLLocalDB')

  const config: SqlConfig = {
    server,
    database: process.env.SQLSERVER_DATABASE ?? 'xnotes-db',
    driver: process.env.SQLSERVER_DRIVER ?? 'ODBC Driver 17 for SQL Server',
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
    options: {
      instanceName,
      trustedConnection: !user,
      encrypt: false,
      trustServerCertificate: true,
    },
  }

  if (process.env.SQLSERVER_PORT && !instanceName) {
    config.port = Number(process.env.SQLSERVER_PORT)
  }

  if (user) {
    config.user = user
    config.password = password
  }

  return config
}

export function getSqlPool() {
  if (!poolPromise) {
    const pool = new sql.ConnectionPool(getSqlConfig())
    poolPromise = pool.connect()
  }

  return poolPromise
}

function bindParams(request: Request, params: SqlParams) {
  for (const [name, value] of Object.entries(params)) {
    if (value instanceof Date) {
      request.input(name, sql.DateTime2, value)
    } else if (value === null || value === undefined) {
      request.input(name, sql.NVarChar, null)
    } else {
      request.input(name, value)
    }
  }
}

function rowsAffected(result: { rowsAffected: number[] }) {
  return result.rowsAffected.reduce((sum, count) => sum + count, 0)
}

export async function sqlQuery<T>(statement: string, params: SqlParams = {}, transaction?: Transaction) {
  const request = transaction ? transaction.request() : (await getSqlPool()).request()
  bindParams(request, params)

  const result = await request.query<T>(statement)
  return result.recordset as T[]
}

export async function sqlExecute(statement: string, params: SqlParams = {}, transaction?: Transaction) {
  const request = transaction ? transaction.request() : (await getSqlPool()).request()
  bindParams(request, params)

  const result = await request.query(statement)
  return rowsAffected(result)
}

export async function withSqlTransaction<T>(work: (transaction: Transaction) => Promise<T>) {
  const transaction = new sql.Transaction(await getSqlPool())
  await transaction.begin()

  try {
    const result = await work(transaction)
    await transaction.commit()
    return result
  } catch (error) {
    await transaction.rollback().catch(() => undefined)
    throw error
  }
}
