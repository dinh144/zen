import { z } from "zod"
import { KINDS } from "./types"

// Request and response shapes for every route in app/api, declared once so the OpenAPI document
// (scripts/openapi.ts) and each route's own validation both read from the same source.

export const CardKind = z.enum(KINDS)

const nullableString = z.string().nullable()

export const CardSchema = z
  .object({
    id: z.uuid(),
    kind: CardKind,
    title: nullableString,
    url: nullableString,
    domain: nullableString,
    note: nullableString,
    content: nullableString,
    image_path: nullableString,
    meta: z.record(z.string(), z.unknown()),
    colors: z.array(z.string()),
    tags: z.array(z.string()),
    space_ids: z.array(z.uuid()).optional(),
    has_article: z.boolean(),
    pinned_at: nullableString,
    seen_at: nullableString,
    enriched_at: nullableString,
    created_at: z.string(),
    updated_at: z.string(),
  })
  .meta({ id: "Card", description: "A saved card: a note, link, image or other kind of memory." })

export const SpaceSchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
    query: z.string().nullable(),
    share_token: z.string().nullable(),
    created_at: z.string(),
    parent_id: z.uuid().nullable().optional(),
    card_count: z.number().optional(),
    cover: z.array(z.string()).optional(),
  })
  .meta({ id: "Space", description: "A named, or query-based smart, group of cards." })

export const ErrorSchema = z.object({ error: z.string() }).meta({ id: "Error" })
export const Ok = z.object({ ok: z.literal(true) }).meta({ id: "Ok" })

// POST /api/login — the only unauthenticated route.
export const LoginInput = z.object({ password: z.string() }).meta({ id: "LoginInput" })

// GET /api/cards — a bad query param falls back to "unset" rather than failing the read.
export const CardsQuery = z
  .object({
    q: z.string().trim().min(1).optional().catch(undefined),
    limit: z.coerce.number().int().positive().max(500).optional().catch(undefined),
    after: z.uuid().optional().catch(undefined),
  })
  .meta({
    id: "CardsQuery",
    description:
      "limit above 500 (or any other malformed value) is dropped and the default of 60 is used instead — " +
      "it is not clamped to 500. A repeated query key uses its last value, not its first.",
  })
export const CardsListResponse = z.object({ cards: z.array(CardSchema) }).meta({ id: "CardsList" })

// POST /api/cards
export const CardInput = z
  .object({
    url: z.string().nullable().optional(),
    note: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    kind: CardKind.optional(),
    quote: z.string().optional(),
    content: z.string().nullable().optional(),
  })
  .meta({ id: "CardInput", description: "A new card: give a url, a note, a quote, or any mix." })
export const CardResponse = z.object({ card: CardSchema }).meta({ id: "CardResponse" })

// GET /api/cards/{id}
export const CardDetailResponse = z
  .object({ card: CardSchema, related: z.array(CardSchema), links: z.array(CardSchema), resurface: z.string().nullable() })
  .meta({ id: "CardDetail" })

// PATCH /api/cards/{id}
export const CardPatch = z
  .object({
    kind: CardKind.optional(),
    title: z.string().nullable().optional(),
    note: z.string().nullable().optional(),
    colors: z.array(z.string()).optional(),
    tags: z.array(z.string().max(60)).optional(),
    pinned: z.boolean().optional(),
    seen: z.boolean().optional(),
    link: z.uuid().optional(),
    unlink: z.uuid().optional(),
    restore: z.boolean().optional(),
    resurface: z
      .union([z.string(), z.null()])
      .optional()
      .refine((value) => !value || !Number.isNaN(Date.parse(value)), { message: "bad date" }),
  })
  .meta({ id: "CardPatch" })

// GET /api/cards/{id}/vibe
export const VibeResponse = z.object({ cards: z.array(CardSchema) }).meta({ id: "Vibe" })

// GET /api/spaces
export const SpacesListResponse = z.object({ spaces: z.array(SpaceSchema) }).meta({ id: "SpacesList" })

// POST /api/spaces
export const SpaceInput = z
  .object({ name: z.string().trim().min(1), query: z.string().nullable().optional(), parent: z.uuid().optional().catch(undefined) })
  .meta({ id: "SpaceInput", description: "parent must be one of this mind's own space ids, or it is dropped." })
export const SpaceCreatedResponse = z.object({ space: SpaceSchema }).meta({ id: "SpaceCreated" })

// GET /api/spaces/{id}
export const SpaceCardsResponse = z.object({ cards: z.array(CardSchema) }).meta({ id: "SpaceCards" })

// PATCH /api/spaces/{id}
export const SpacePatch = z
  .object({ add: z.uuid().optional(), remove: z.uuid().optional(), shared: z.boolean().optional() })
  .meta({ id: "SpacePatch" })
export const SpacePatchResponse = z.union([z.object({ ok: z.literal(true) }), z.object({ space: SpaceSchema })]).meta({ id: "SpacePatchResult" })

// POST /api/ask
export const AskInput = z.object({ question: z.string().trim().min(1) }).meta({ id: "AskInput", description: "Truncated server-side to 500 characters." })

// The real shape ask() (lib/agent.ts) and the route's own additions (lib/clusters.ts, lib/tasks.ts,
// lib/agent-tools.ts) can return — replaces a former placeholder of "any object".
const EdgeSchema = z.object({ source: z.string(), predicate: z.string(), target: z.string(), card_id: z.string().nullable() })
const GrillOptionSchema = z.object({ label: z.string(), detail: z.string() })
const GrillQuestionSchema = z.object({ id: z.string(), question: z.string(), options: z.array(GrillOptionSchema) })
const FindingSchema = z.object({ title: z.string(), url: z.string(), why: z.string() })
const LintSchema = z.object({
  duplicates: z.array(z.object({ keep: z.string(), drop: z.string(), similarity: z.number() })),
  orphans: z.array(z.string()),
})
export const AskReply = z
  .union([
    z.object({
      kind: z.literal("answer"),
      text: z.string(),
      cards: z.array(z.string()),
      edges: z.array(EdgeSchema),
      findings: z.array(FindingSchema).optional(),
      done: z.array(z.string()).optional(),
    }),
    z.object({ kind: z.literal("grill"), text: z.string(), questions: z.array(GrillQuestionSchema) }),
    z.object({ kind: z.literal("none"), text: z.string() }),
    z.object({
      kind: z.literal("task"),
      text: z.string(),
      task: z.literal("organize"),
      topic: z.string(),
      done: z.object({ machine: z.number(), pinned: z.number(), loose: z.number() }),
    }),
    z.object({ kind: z.literal("task"), text: z.string(), task: z.literal("web"), topic: z.string(), findings: z.array(FindingSchema) }),
    z.object({ kind: z.literal("task"), text: z.string(), task: z.literal("lint"), topic: z.string(), lint: LintSchema }),
  ])
  .meta({ id: "AskReply" })

// POST /api/ask/answer
export const AskAnswerInput = z
  .object({ id: z.string(), answer: z.string() })
  .meta({ id: "AskAnswerInput", description: "Answers an open question the agent grilled; answer is truncated server-side to 300 characters." })

// PATCH /api/settings
export const SettingsPatch = z.object({ locale: z.string() }).meta({ id: "SettingsPatch", description: "One of the app's locale codes (vi, en, ko, zh, ja)." })

// GET /api/reenrich
export const ReenrichQuery = z.object({ all: z.enum(["0", "1"]).optional().catch(undefined) }).meta({ id: "ReenrichQuery" })
export const ReenrichResponse = z.object({ queued: z.number() }).meta({ id: "ReenrichResponse" })

// GET /api/export
export const ExportResponse = z
  .object({
    exported_at: z.string(),
    cards: z.array(z.record(z.string(), z.unknown())),
    spaces: z.array(z.record(z.string(), z.unknown())),
    members: z.array(z.record(z.string(), z.unknown())),
    links: z.array(z.record(z.string(), z.unknown())),
  })
  .meta({ id: "Export", description: "Every card (embeddings left out), space, membership and link this mind owns." })

// POST /api/import — a zen export re-imported, or {cards:[...]} from any other JSON source.
// Bookmark HTML and Raindrop/Pocket CSV are also accepted as plain text; see lib/import.ts.
export const ImportInput = z
  .object({
    cards: z.array(z.record(z.string(), z.unknown())).optional(),
    spaces: z.array(z.object({ id: z.string(), name: z.string(), query: z.string().nullable().optional() })).optional(),
    members: z.array(z.object({ card_id: z.string(), space_id: z.string() })).optional(),
    links: z.array(z.object({ from_id: z.string(), to_id: z.string() })).optional(),
  })
  .meta({ id: "ImportInput" })
export const ImportResponse = z.object({ imported: z.number() }).meta({ id: "ImportResponse" })

// POST /api/upload — JSON body variant; the multipart/form-data variant is documented separately.
export const UploadTicketInput = z.object({ intent: z.literal("ticket"), name: z.string().optional(), size: z.number() }).meta({ id: "UploadTicketInput" })
export const UploadDoneInput = z
  .object({ intent: z.string().optional(), file: z.string(), name: z.string().optional(), type: z.string().optional() })
  .meta({ id: "UploadDoneInput" })
export const UploadTicketResponse = z.object({ name: z.string(), url: z.string() }).meta({ id: "UploadTicketResponse" })

// POST /api/mcp — a JSON-RPC 2.0 tool server for AI assistants; save_card is its one write.
export const McpSearchArgs = z.object({ query: z.string() }).meta({ id: "McpSearchArgs" })
export const McpGetCardArgs = z.object({ id: z.string() }).meta({ id: "McpGetCardArgs" })
export const McpSaveCardArgs = z
  .object({ note: z.string().optional(), url: z.string().optional(), title: z.string().optional() })
  .meta({ id: "McpSaveCardArgs", description: "note or url is required (checked at runtime, not expressible in this shape)." })
export const McpAskArgs = z.object({ question: z.string() }).meta({ id: "McpAskArgs" })
export const McpRequest = z
  .object({
    jsonrpc: z.literal("2.0"),
    id: z.union([z.string(), z.number(), z.null()]).optional(),
    method: z.string(),
    params: z.unknown().optional(),
  })
  .meta({
    id: "McpRequest",
    description:
      "method: initialize | ping | tools/list | tools/call. For tools/call, params = {name, arguments}; " +
      "arguments per tool: search_memory -> McpSearchArgs, get_card -> McpGetCardArgs, " +
      "save_card -> McpSaveCardArgs, ask_zen -> McpAskArgs.",
  })
export const McpResponse = z
  .object({ jsonrpc: z.literal("2.0"), id: z.union([z.string(), z.number(), z.null()]) })
  .catchall(z.unknown())
  .meta({ id: "McpResponse", description: "A JSON-RPC 2.0 result or error envelope." })
