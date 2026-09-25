# Reviewed `oasdiff breaking` exceptions

Two removals the Python API makes on purpose, both retired with local mode (spec `.scratch/zen-api/spec.md`,
"Auth and isolation": password sign-in stays cloud-staging-only behind an allowlist, and the web moves to
bearer tokens). Reviewed 2026-09-25, ticket api-2.

- GET /cards the endpoint scheme security `cookieAuth` was removed from the API
- POST /login api removed without deprecation
