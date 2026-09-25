/** Staging only: test minds get an email+password sign-in. Off (the default, including production),
 *  the password field never renders and /auth/password refuses every request. Inlined at build,
 *  so client and server code both read it — same pattern as CLOUD in lib/cloud.ts. */
export const STAGING = Boolean(process.env.NEXT_PUBLIC_ZEN_STAGING)
