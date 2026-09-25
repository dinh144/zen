// A dropped session must never lose what the mind was writing, and an unreachable API must never
// throw through to the board. bun runs headless (no window.localStorage), so a tiny in-memory stand-in
// takes its place — the contract under test is safely()'s branching, not Storage itself.
import { describe, expect, test, mock } from "bun:test"

const store = new Map<string, string>()
;(globalThis as { localStorage?: Storage }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
} as Storage

const { safely, keepDraft, takeKeptDraft } = await import("./browser")

describe("keepDraft / takeKeptDraft", () => {
  test("round-trips, and clears once read", () => {
    keepDraft("a card half-written")
    expect(takeKeptDraft()).toBe("a card half-written")
    expect(takeKeptDraft()).toBe("")
  })
  test("never saves a blank draft", () => {
    keepDraft("   ")
    expect(takeKeptDraft()).toBe("")
  })
})

describe("safely", () => {
  test("a dropped session (401) keeps the draft and sends the mind to sign in, without throwing", async () => {
    const goToSignIn = mock(() => {})
    const result = await safely(async () => ({ response: new Response(null, { status: 401 }) }), "unsent note", "unreachable", goToSignIn)
    expect(result).toBeNull()
    expect(goToSignIn).toHaveBeenCalledTimes(1)
    expect(takeKeptDraft()).toBe("unsent note")
  })
  test("an unreachable API returns null instead of throwing, and never touches sign-in", async () => {
    const goToSignIn = mock(() => {})
    const result = await safely(
      async () => {
        throw new TypeError("fetch failed")
      },
      "unsent note",
      "unreachable",
      goToSignIn,
    )
    expect(result).toBeNull()
    expect(goToSignIn).not.toHaveBeenCalled()
  })
  test("a normal reply passes its data through untouched", async () => {
    const result = await safely(async () => ({ data: { cards: [] }, response: new Response(null, { status: 200 }) }), "", "unreachable", () => {})
    expect(result).toEqual({ cards: [] })
  })
})
