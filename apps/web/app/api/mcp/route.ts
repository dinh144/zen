import { ask } from "@/lib/agent"
import { createCard, getCard, searchCards, spend } from "@/lib/cards"
import { queueCard } from "@/lib/jobs"
import { languageOf } from "@/lib/settings"
import { bearerUser, currentUser } from "@/lib/user"

// zen as memory for other AIs: a Model Context Protocol server over Streamable HTTP (JSON responses).
// Claude, ChatGPT or agy connect by URL and sign in; every call runs as that person's mind.

const TOOLS = [
  {
    name: "search_memory",
    description: "Search the person's saved cards (notes, links, images, quotes) by meaning or words, in any language.",
    inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
  },
  {
    name: "get_card",
    description: "Read one saved card in full by its id.",
    inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
  },
  {
    name: "save_card",
    description: "Save a note or a link into the person's memory. Give either note or url.",
    inputSchema: {
      type: "object",
      properties: { note: { type: "string" }, url: { type: "string" }, title: { type: "string" } },
    },
  },
  {
    name: "ask_zen",
    description: "Ask a question answered only from the person's saved cards, with the cards it came from.",
    inputSchema: { type: "object", properties: { question: { type: "string" } }, required: ["question"] },
  },
]

const reply = (id: unknown, result: unknown) => Response.json({ jsonrpc: "2.0", id, result })
const failure = (id: unknown, code: number, message: string) => Response.json({ jsonrpc: "2.0", id, error: { code, message } })
const text = (value: unknown) => ({ content: [{ type: "text", text: JSON.stringify(value, null, 2) }] })

const brief = (card: { id: string; kind: string; title: string | null; note: string | null; url: string | null; tags: string[] }) => ({
  id: card.id,
  kind: card.kind,
  title: card.title,
  note: card.note,
  url: card.url,
  tags: card.tags,
})

export async function POST(request: Request) {
  const me = (await bearerUser(request)) ?? (await currentUser())
  if (!me) {
    const origin = new URL(request.url).origin
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: {
        "content-type": "application/json",
        "www-authenticate": `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource"`,
      },
    })
  }
  const message = await request.json().catch(() => null)
  if (!message || message.jsonrpc !== "2.0") return failure(null, -32600, "invalid request")
  const { id, method, params } = message
  if (id === undefined) return new Response(null, { status: 202 }) // a notification needs no answer

  switch (method) {
    case "initialize":
      return reply(id, {
        protocolVersion: params?.protocolVersion ?? "2025-06-18",
        capabilities: { tools: {} },
        serverInfo: { name: "zen ai", version: "1.0.0" },
        instructions: "zen is this person's visual memory. Search it before assuming; save only what they ask you to save.",
      })
    case "ping":
      return reply(id, {})
    case "tools/list":
      return reply(id, { tools: TOOLS })
    case "tools/call": {
      const args = params?.arguments ?? {}
      switch (params?.name) {
        case "search_memory":
          return reply(id, text((await searchCards(me, String(args.query ?? ""), 15)).map(brief)))
        case "get_card": {
          const card = await getCard(me, String(args.id ?? ""))
          return card ? reply(id, text({ ...brief(card), content: card.content?.slice(0, 8000) })) : failure(id, -32602, "no such card")
        }
        case "save_card": {
          if (!args.note && !args.url) return failure(id, -32602, "note or url")
          if (!(await spend(me))) return failure(id, -32000, "daily limit")
          const card = await createCard(me, { note: args.note ?? null, url: args.url ?? null, title: args.title ?? null })
          await queueCard(card.id, me)
          return reply(id, text({ saved: card.id }))
        }
        case "ask_zen":
          return reply(id, text(await ask(me, String(args.question ?? ""), await languageOf(me))))
        default:
          return failure(id, -32601, "unknown tool")
      }
    }
    default:
      return failure(id, -32601, "unknown method")
  }
}
