/** Polls `fn` until it returns a truthy value or `timeout` elapses; returns the last result. */
export async function pollUntil(fn, { timeout = 5000, interval = 200 } = {}) {
  const deadline = Date.now() + timeout
  for (;;) {
    const result = await fn()
    if (result) return result
    if (Date.now() >= deadline) return result
    await new Promise((r) => setTimeout(r, interval))
  }
}
