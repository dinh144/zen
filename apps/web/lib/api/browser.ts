"use client"

import { createBrowserClient } from "@supabase/ssr"
import { CLOUD } from "@/lib/cloud"
import { notify } from "@/lib/notify"
import { apiClient } from "./client"

// Locally the browser's same-origin cookie already authenticates every request; in the cloud the
// browser has no cookie the API can read across origins, so it sends the Supabase session's own
// (auto-refreshed by this client) access token as a bearer header instead.
const supabase = CLOUD ? createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!) : null

async function browserToken() {
  return supabase ? (await supabase.auth.getSession()).data.session?.access_token : undefined
}

const DRAFT_KEY = "zen_draft_kept"

/** Saves what the mind was writing before sending them to sign in again. */
export const keepDraft = (text: string) => {
  if (text.trim()) localStorage.setItem(DRAFT_KEY, text)
}

/** Reads back a kept draft once (a fresh board mount, after signing back in) and clears it. */
export function takeKeptDraft() {
  const draft = localStorage.getItem(DRAFT_KEY)
  if (draft !== null) localStorage.removeItem(DRAFT_KEY)
  return draft ?? ""
}

/**
 * Runs one API call with the mind's current token. A dropped session (401) keeps `draft` and sends
 * the mind to sign in; an unreachable API shows a calm toast instead of throwing. Either way this
 * returns `null` rather than an exception, so the caller's own state — and whatever the mind was
 * writing — is never touched by a failed call.
 */
export async function safely<T>(
  call: (api: ReturnType<typeof apiClient>) => Promise<{ data?: T; response: Response }>,
  draft: string,
  unreachableMessage: string,
  goToSignIn: () => void,
): Promise<T | null> {
  try {
    const { data, response } = await call(apiClient(await browserToken()))
    if (response.status === 401) {
      keepDraft(draft)
      goToSignIn()
      return null
    }
    return data ?? null
  } catch {
    notify(unreachableMessage)
    return null
  }
}
