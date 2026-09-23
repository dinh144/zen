import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

import { CLOUD } from "./cloud"

/** Without Supabase zen runs as one local mind behind ZEN_PASSWORD. */
export const cloud = CLOUD

export async function supabaseServer() {
  const store = await cookies()
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options)
        } catch {
          // Server components cannot write cookies; the proxy refreshes the session instead.
        }
      },
    },
  })
}
