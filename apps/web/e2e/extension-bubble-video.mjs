import path from "node:path"
import fs from "node:fs"
import os from "node:os"
import { fileURLToPath } from "node:url"
import { execFileSync } from "node:child_process"
import { chromium } from "playwright"
import { serveFixtures } from "./fixtures.mjs"

// A Playwright video of the resting drop for Dinh's visual review (ticket ext-2): rests in its
// corner, opens on click, moves to another corner, hides, and mutes. node e2e/extension-bubble-video.mjs

const ROOT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../..")
const EXT_DIR = path.join(ROOT_DIR, "extension")
execFileSync("bun", ["scripts/generate-drop-assets.ts"], { cwd: ROOT_DIR, stdio: "inherit" })

const OUT_DIR = new URL("./.shots/", import.meta.url).pathname
fs.mkdirSync(OUT_DIR, { recursive: true })

const fixtures = await serveFixtures()
const ctx = await chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(), "zen-ext-video-")), {
  channel: "chromium",
  headless: true,
  args: [`--disable-extensions-except=${EXT_DIR}`, `--load-extension=${EXT_DIR}`],
  recordVideo: { dir: OUT_DIR, size: { width: 1000, height: 700 } },
})
try {
  const page = await ctx.newPage()
  const host = page.locator("[data-zen-drop-host]")

  await page.goto(fixtures.url + "/")
  await host.waitFor({ state: "attached" })
  await page.waitForTimeout(600) // rests, in view

  await host.hover()
  await page.waitForTimeout(500) // the hover scale

  await host.click() // opens the menu
  await page.waitForTimeout(700)

  await page.keyboard.press("Enter") // "move to another corner" is focused first — activates it
  await page.waitForTimeout(700)

  await host.click() // open again, in the new corner
  await page.waitForTimeout(500)
  await page.keyboard.press("Escape") // closes, focus returns
  await page.waitForTimeout(600)

  await page.close()
} finally {
  await ctx.close()
  fixtures.close()
}

const file = fs.readdirSync(OUT_DIR).find((f) => f.endsWith(".webm"))
console.log(`video saved: ${OUT_DIR}${file}`)
