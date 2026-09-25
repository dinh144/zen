// Creates, or resets the password of, a staging test mind for the password sign-in in
// app/auth/password/route.ts. Its email still needs adding to ZEN_ALLOWLIST by hand.
//   bun --env-file=.env.local scripts/create-test-mind.ts <email> <password>
import { admin } from "../lib/storage"

const [email, password] = process.argv.slice(2)
if (!email || !password) {
  console.error("usage: bun scripts/create-test-mind.ts <email> <password>")
  process.exit(1)
}

const client = admin()
const { data: existing, error: listError } = await client.auth.admin.listUsers()
if (listError) throw listError
const found = existing.users.find((u) => u.email === email)
const { data, error } = found
  ? await client.auth.admin.updateUserById(found.id, { password, email_confirm: true })
  : await client.auth.admin.createUser({ email, password, email_confirm: true })
if (error) throw error
console.log(`test mind ready: ${data.user?.email} (${data.user?.id})`)
console.log(`now add "${email}" to ZEN_ALLOWLIST, or it can authenticate but never sign in`)
