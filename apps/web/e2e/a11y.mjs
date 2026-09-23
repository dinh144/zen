import { chromium } from "playwright"
import AxeBuilder from "@axe-core/playwright"
import fs from "node:fs"

// Every route × desk/phone × light/dark: status, horizontal overflow, console errors, axe WCAG 2.1 AA.
// node e2e/a11y.mjs <card-with-article-id> <space-id> <share-token>
const BASE = process.env.ZEN_URL ?? "http://localhost:3000"
const [card, space, token] = process.argv.slice(2)
const ROUTES = ["/", "/welcome", "/login", "/spaces", `/spaces/${space}`, "/serendipity", "/settings", "/achievements",
  "/focus", `/read/${card}`, `/vibe/${card}`, `/s/${token}`, "/s/nope", "/does-not-exist"]
const VIEWS = [{ name: "desk", width: 1440, height: 900 }, { name: "phone", width: 390, height: 844 }]
const THEMES = ["light", "dark"]
const OUT = new URL("./.shots/", import.meta.url).pathname
fs.mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
const report = []
for (const view of VIEWS) for (const theme of THEMES) {
  const ctx = await browser.newContext({ viewport: view, colorScheme: theme })
  await ctx.addInitScript((t) => localStorage.setItem("theme", t), theme)
  for (const route of ROUTES) {
    const page = await ctx.newPage()
    const errors = []
    page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 160)))
    page.on("pageerror", (e) => errors.push("PAGEERROR " + e.message.slice(0, 160)))
    const res = await page.goto(BASE + route, { waitUntil: "load" }).catch((e) => ({ status: () => "ERR " + e.message }))
    await page.waitForTimeout(3500) // let page-in and reveal animations settle before axe measures contrast
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    let axe = []
    if (theme === "light" || view.name === "desk") {
      const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()
      axe = r.violations.map((v) => `${v.impact}:${v.id}(${v.nodes.length}) ${v.nodes[0]?.target?.join(" ")}`)
    }
    const file = `${view.name}-${theme}-${route.replace(/[^a-z0-9]+/gi, "_") || "root"}.png`
    await page.screenshot({ path: OUT + file, fullPage: false })
    report.push({ view: view.name, theme, route, status: res.status(), overflow, errors, axe })
    await page.close()
  }
  await ctx.close()
}
await browser.close()
for (const r of report) {
  const bad = r.overflow > 0 || r.errors.length || r.axe.length || (r.status !== 200 && !r.route.includes("nope") && !r.route.includes("not-exist"))
  if (bad) console.log(JSON.stringify(r))
}
console.log("pages checked:", report.length)
if (report.some((r) => r.axe.length || r.errors.length && !r.route.includes("not-exist") || r.overflow > 0)) process.exit(1)
