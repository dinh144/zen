/** Supabase is on when its URL is set. Inlined at build, so client and server code both read it. */
export const CLOUD = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL)
