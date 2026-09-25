import { chromium } from "playwright"
import AxeBuilder from "@axe-core/playwright"
import { execFileSync } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { serveFixtures } from "./fixtures.mjs"
import { createReporter } from "./extension-harness.mjs"

// axe cannot see inside a closed shadow root, so this scans the drop's UI (extension/drop-ui.js)
// mounted into a plain element instead — the exact same markup and focus logic bubble.js wraps
// in one (fixtures.mjs's /__drop_a11y__). node e2e/extension-a11y.mjs

const ROOT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../..")
execFileSync("bun", ["scripts/generate-drop-assets.ts"], { cwd: ROOT_DIR, stdio: "inherit" })

const { ok, failed } = createReporter()
const fixtures = await serveFixtures()
const browser = await chromium.launch()
try {
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  await page.goto(fixtures.url + "/__drop_a11y__")

  const scan = () => new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()
  const violations = (r) => r.violations.map((v) => `${v.impact}:${v.id}(${v.nodes.length})`).join(", ")

  let r = await scan()
  ok("resting drop: no AA violations", r.violations.length === 0, violations(r))

  await page.locator("#mount button").first().click()
  ok("menu opens", await page.evaluate(() => window.__zenHandle.isMenuOpen()))
  r = await scan()
  ok("drop with the menu open: no AA violations", r.violations.length === 0, violations(r))
} finally {
  await browser.close()
  fixtures.close()
}
process.exit(failed() ? 1 : 0)
