import postgres from "postgres"

const url = process.env.DATABASE_URL ?? "postgres://zen:zen@localhost:5433/zen"

declare global {
  // eslint-disable-next-line no-var
  var __zenSql: ReturnType<typeof postgres> | undefined
}

export const sql = globalThis.__zenSql ?? postgres(url, { max: 4 })
if (process.env.NODE_ENV !== "production") globalThis.__zenSql = sql
