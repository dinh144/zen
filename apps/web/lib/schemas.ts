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

// POST /api/login — the only unauthenticated route.
export const LoginInput = z.object({ password: z.string() }).meta({ id: "LoginInput" })

// GET /api/cards — a bad query param falls back to "unset" rather than failing the read.
export const CardsQuery = z
  .object({
    q: z.string().trim().min(1).optional().catch(undefined),
    limit: z.coerce.number().int().positive().max(500).optional().catch(undefined),
    after: z.uuid().optional().catch(undefined),
  })
  .meta({ id: "CardsQuery" })
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
export const CardCreatedResponse = z.object({ card: CardSchema }).meta({ id: "CardCreated" })

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

// DELETE /api/log/{id}
export const UndoResponse = z.object({ ok: z.literal(true) }).meta({ id: "Undo" })
