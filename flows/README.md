# Shared Maestro flows

One flow set for both mobile apps (Android now, iOS later — spec `.scratch/zen-android/spec.md`,
Testing Decisions, Seam 1). A flow is written once here and runs unchanged on either app.

Run against the Android app on the `pixel_api36` emulator:

```bash
maestro test -e APP_ID=com.dinh144.zen flows/smoke.yaml
```

## The `screen.element` convention

Every element a flow needs to find gets a stable id: `<screen>.<element>`, lowercase, e.g.
`board.search`, `capture.voice`, `pool.panel`, `signin.screen`, `signin.google`. Flows select it
with the `id:` selector, which Maestro maps to the platform's own technical identifier:

- **Android (Compose):** `Modifier.testTag("screen.element")` on the element. Once per app, wrap
  the root composable in `Modifier.semantics { testTagsAsResourceId = true }` (done in
  `apps/android/app/src/main/kotlin/com/dinh144/zen/MainActivity.kt`) so every `testTag` below it
  is exposed as an Android resource-id.
- **iOS (SwiftUI, when that lane starts):** `.accessibilityIdentifier("screen.element")`.

Never select on visible text alone when an id is available — text changes per locale and per mood
copy; the id does not.

## appId

Flows use `appId: ${APP_ID}` and take the app id from `-e APP_ID=...` at the command line, so the
same file runs against `com.dinh144.zen` (phone/tablet) or the iOS bundle id later without edits.

## Flow conventions (prior art: skinsense-v2's `apps/mobile/flows/`)

- A header comment states the ticket, preconditions, and (when it's not obvious) the run command.
- Where copy matters, match text bilingually: `"Continue|Tiếp tục"` (zen ships five locales; use
  whichever two the flow's preconditions fix, or extend the alternation).
- Reset permissions and signed-in state through `adb` / `launchApp: { permissions: ... }`, not by
  hand.
- Cold starts get `extendedWaitUntil` with a generous timeout instead of a fixed `assertVisible`.
