import http from "node:http"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const EXT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../../extension")

// A minimal page with a link, an image and selectable text — a stand-in for "any site" so the
// extension's entry points (not zen's own UI) are what the harness exercises.
const PNG_1X1 = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64")

// A Map, not a plain object: a plain object's bracket lookup walks the prototype chain, so a
// request for a path like "/constructor" could resolve to Object.prototype.constructor instead
// of undefined and crash the server trying to serve it as a response body.
const PAGES = new Map([
  ["/", `<!doctype html><html><body>
    <p id="quote">the quiet drop keeps what the mind finds</p>
    <a id="link" href="/other">a linked page</a>
    <img id="pic" src="/pic.png" width="1" height="1" />
  </body></html>`],
  ["/other", `<!doctype html><html><body><p>the other fixture page</p></body></html>`],
  ["/password", `<!doctype html><html><body><input type="password" /></body></html>`],
  ["/late-password", `<!doctype html><html><body><a id="link" href="/other">a link</a>
    <script>setTimeout(() => document.body.appendChild(Object.assign(document.createElement('input'), { type: 'password' })), 300)</script>
  </body></html>`],
])

// The drop's UI (extension/drop-ui.js), mounted into a plain element instead of a closed shadow
// root: axe cannot see inside a closed shadow root, and this is the exact same markup and focus
// logic bubble.js wraps in one, so what axe checks here is what a mind actually gets. Read fresh
// on every request, not cached at module load — scripts/generate-drop-assets.ts writes
// build/moods.generated.js before the harness starts.
function dropA11yPage() {
  const moods = fs.readFileSync(path.join(EXT_DIR, "build/moods.generated.js"), "utf8")
  const ui = fs.readFileSync(path.join(EXT_DIR, "drop-ui.js"), "utf8")
  const messages = JSON.parse(fs.readFileSync(path.join(EXT_DIR, "_locales/en/messages.json"), "utf8"))
  return `<!doctype html><html lang="en"><head><title>drop a11y fixture</title></head><body>
    <a href="/other">a link on the page</a>
    <div id="mount"></div>
    <script>${moods}</script>
    <script>${ui}</script>
    <script>
      const MESSAGES = ${JSON.stringify(messages)}
      const t = (key) => (MESSAGES[key] && MESSAGES[key].message) || key
      window.__zenHandle = ZenDropUI.mount(document.getElementById("mount"), { t, corner: "bottom-right" })
    </script>
  </body></html>`
}

/** Serves the fixture pages on a free local port. Call `close()` when the harness is done. */
export function serveFixtures() {
  const server = http.createServer((req, res) => {
    if (req.url === "/pic.png") {
      res.writeHead(200, { "content-type": "image/png" })
      return res.end(PNG_1X1)
    }
    if (req.url === "/__drop_a11y__") {
      res.writeHead(200, { "content-type": "text/html" })
      return res.end(dropA11yPage())
    }
    const body = PAGES.get(req.url)
    if (body) {
      res.writeHead(200, { "content-type": "text/html" })
      return res.end(body)
    }
    res.writeHead(404)
    res.end()
  })
  // Bound to "localhost" (not 127.0.0.1): the extension's host_permissions match that hostname
  // literally, on any port, per Chrome's match-pattern rules.
  return new Promise((resolve, reject) => {
    server.on("error", (e) => {
      console.error("fixture server error:", e.message)
      reject(e) // a no-op once the promise below has already resolved
    })
    server.listen(0, "localhost", () =>
      resolve({ url: `http://localhost:${server.address().port}`, close: () => server.close() }),
    )
  })
}
