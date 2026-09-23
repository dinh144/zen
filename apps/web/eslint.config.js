import { nextJsConfig } from "@workspace/eslint-config/next-js"

/** @type {import("eslint").Linter.Config} */
export default [
  ...nextJsConfig,
  // Browser test scripts run in Node and inside pages; the app's rules do not fit them.
  { ignores: ["e2e/**"] },
]
