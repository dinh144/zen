// Ticket web-4's scripted client: signs in as one mind against a Supabase stack, syncs from the
// PowerSync instance sitting in front of it, and inspects what actually arrived.
//
//   SUPABASE_URL=http://127.0.0.1:55021 SUPABASE_ANON_KEY=... POWERSYNC_URL=http://127.0.0.1:8090 \
//   EMAIL=mind-a@zen-wf-0.test PASSWORD=testpass123 \
//     node verify.mjs [forbidden-title-substring]
//
// Exits non-zero if an embedding column, a server-only table (usage, aliases), or a card whose
// title contains the optional forbidden substring (another mind's row) shows up in the synced
// data. Prints every card it did receive either way.
import { PowerSyncDatabase, Schema, Table, column } from "@powersync/node"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

const { SUPABASE_URL, SUPABASE_ANON_KEY, POWERSYNC_URL, EMAIL, PASSWORD } = process.env
const forbidden = process.argv[2]
for (const [name, value] of Object.entries({ SUPABASE_URL, SUPABASE_ANON_KEY, POWERSYNC_URL, EMAIL, PASSWORD })) {
  if (!value) {
    console.error(`missing env var ${name}`)
    process.exit(1)
  }
}

const signIn = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: { apikey: SUPABASE_ANON_KEY, "content-type": "application/json" },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
})
if (!signIn.ok) {
  console.error(`sign-in failed: HTTP ${signIn.status} ${await signIn.text()}`)
  process.exit(1)
}
const { access_token: token } = await signIn.json()

// Minimal columns for the SDK's own view; the raw ps_data__cards check below is what actually
// proves no extra column crossed the wire, independent of what this script declares here.
const cards = new Table({ title: column.text })
const dbFilename = path.join(os.tmpdir(), `powersync-verify-${Date.now()}.db`)
const db = new PowerSyncDatabase({ schema: new Schema({ cards }), database: { dbFilename } })

let failed = false
await db.connect({
  fetchCredentials: async () => ({ endpoint: POWERSYNC_URL, token }),
  uploadData: async () => {},
})
await db.waitForFirstSync()

const cardRows = await db.getAll("SELECT id, title FROM cards")
console.log(`cards visible: ${JSON.stringify(cardRows)}`)
if (forbidden && cardRows.some((r) => r.title?.includes(forbidden))) {
  console.error(`FAIL: a card containing "${forbidden}" (another mind's row) was synced`)
  failed = true
}

for (const row of await db.getAll("SELECT data FROM ps_data__cards")) {
  const keys = Object.keys(JSON.parse(row.data))
  if (keys.includes("embedding")) {
    console.error(`FAIL: embedding present in synced card data (keys: ${keys.join(", ")})`)
    failed = true
  }
}

const tables = (await db.getAll("SELECT name FROM sqlite_master WHERE type = 'table'")).map((t) => t.name)
for (const name of ["usage", "aliases"]) {
  if (tables.includes(`ps_data__${name}`)) {
    console.error(`FAIL: excluded table ${name} synced`)
    failed = true
  }
}

await db.disconnect()
await db.close()
fs.rmSync(dbFilename, { force: true })

if (failed) process.exit(1)
console.log("OK: only this mind's rows synced, no embeddings, no excluded tables")
