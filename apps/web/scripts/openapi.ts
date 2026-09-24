// Generates the committed OpenAPI contract from the route schemas in lib/schemas.ts.
//   bun scripts/openapi.ts
// CI re-runs this and fails if the committed apps/web/openapi.json goes stale (see docs/agents or
// CLAUDE.md for the additive-only rule, and .github/workflows/ci.yml for the oasdiff breaking check).
import { createDocument } from "zod-openapi"
import { z } from "zod"
import {
  AskAnswerInput,
  AskInput,
  CardCreatedResponse,
  CardDetailResponse,
  CardInput,
  CardPatch,
  CardSchema,
  CardsListResponse,
  CardsQuery,
  ErrorSchema,
  ExportResponse,
  ImportInput,
  ImportResponse,
  LoginInput,
  ReenrichQuery,
  ReenrichResponse,
  SettingsPatch,
  SpaceCardsResponse,
  SpaceCreatedResponse,
  SpaceInput,
  SpacePatch,
  SpacePatchResponse,
  SpacesListResponse,
  UndoResponse,
  UploadDoneInput,
  UploadTicketInput,
  UploadTicketResponse,
  VibeResponse,
} from "../lib/schemas"

const auth: Record<string, string[]>[] = [{ cookieAuth: [] }, { bearerAuth: [] }]
const Ok = z.object({ ok: z.literal(true) }).meta({ id: "Ok" })
const CardResponse = z.object({ card: CardSchema }).meta({ id: "CardResponse" })
const idParam = z.object({ id: z.uuid() })
const err = (description: string) => ({ description, content: { "application/json": { schema: ErrorSchema } } })
const ok = (description: string, schema: z.ZodType) => ({ description, content: { "application/json": { schema } } })

const document = createDocument({
  openapi: "3.1.0",
  info: {
    title: "zen API",
    version: "1.0.0",
    description:
      "The only write path for every zen client (web, extension, Android, iOS). Additive only: new endpoints " +
      "and new optional fields are fine; removing or renaming a field, changing a type, or making an optional " +
      "field required is a breaking change and is refused by CI (`oasdiff breaking`).",
  },
  servers: [{ url: "/api" }],
  components: {
    securitySchemes: {
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "zen_session",
        description: "The web session cookie, set by POST /login. Used by the web app and the browser extension.",
      },
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        description: "A Supabase access token in the cloud, or the local session token in local mode. Used by native apps.",
      },
    },
  },
  paths: {
    "/login": {
      post: {
        summary: "Sign in with the local password",
        security: [],
        requestBody: { content: { "application/json": { schema: LoginInput } } },
        responses: { "200": ok("Signed in; the session cookie is set.", Ok), "401": err("Wrong password.") },
      },
    },
    "/cards": {
      get: {
        summary: "List or search cards",
        security: auth,
        requestParams: { query: CardsQuery },
        responses: { "200": ok("OK", CardsListResponse) },
      },
      post: {
        summary: "Capture a new card",
        security: auth,
        requestBody: { content: { "application/json": { schema: CardInput } } },
        responses: { "201": ok("Created", CardCreatedResponse), "400": err("Invalid card"), "429": err("Daily cap reached") },
      },
    },
    "/cards/{id}": {
      get: {
        summary: "Read one card, with what links to it and from it",
        security: auth,
        requestParams: { path: idParam },
        responses: { "200": ok("OK", CardDetailResponse), "404": err("Not found") },
      },
      patch: {
        summary: "Edit, tag, pin, link, restore or resurface a card",
        security: auth,
        requestParams: { path: idParam },
        requestBody: { content: { "application/json": { schema: CardPatch } } },
        responses: { "200": ok("OK", CardResponse), "400": err("Invalid patch"), "404": err("Not found") },
      },
      delete: {
        summary: "Soft-delete a card",
        security: auth,
        requestParams: { path: idParam },
        responses: { "200": ok("OK", Ok) },
      },
    },
    "/cards/{id}/vibe": {
      get: {
        summary: "Same Vibe: a moodboard built from one image card",
        security: auth,
        requestParams: { path: idParam },
        responses: { "200": ok("OK", VibeResponse) },
      },
    },
    "/spaces": {
      get: { summary: "List this mind's spaces", security: auth, responses: { "200": ok("OK", SpacesListResponse) } },
      post: {
        summary: "Create a space (or a Smart Space, given a query)",
        security: auth,
        requestBody: { content: { "application/json": { schema: SpaceInput } } },
        responses: { "201": ok("Created", SpaceCreatedResponse), "400": err("Name required") },
      },
    },
    "/spaces/{id}": {
      get: {
        summary: "A space's cards",
        security: auth,
        requestParams: { path: idParam },
        responses: { "200": ok("OK", SpaceCardsResponse) },
      },
      patch: {
        summary: "Add or remove a card, or share/unshare the space",
        security: auth,
        requestParams: { path: idParam },
        requestBody: { content: { "application/json": { schema: SpacePatch } } },
        responses: { "200": ok("OK", SpacePatchResponse) },
      },
      delete: { summary: "Delete a space", security: auth, requestParams: { path: idParam }, responses: { "200": ok("OK", Ok) } },
    },
    "/ask": {
      post: {
        summary: "Ask the drop a question, answered from this mind's cards",
        security: auth,
        requestBody: { content: { "application/json": { schema: AskInput } } },
        responses: { "200": ok("An answer, or a task the UI carries out.", z.record(z.string(), z.unknown())), "400": err("No question") },
      },
    },
    "/ask/answer": {
      post: {
        summary: "Answer one open question the agent grilled",
        security: auth,
        requestBody: { content: { "application/json": { schema: AskAnswerInput } } },
        responses: { "200": ok("OK", Ok), "400": err("Invalid"), "404": err("Not found") },
      },
    },
    "/log/{id}": {
      delete: {
        summary: "Undo one logged agent or drop action",
        security: auth,
        requestParams: { path: idParam },
        responses: { "200": ok("OK", UndoResponse), "404": err("Nothing to undo") },
      },
    },
    "/settings": {
      patch: {
        summary: "Change this mind's locale",
        security: auth,
        requestBody: { content: { "application/json": { schema: SettingsPatch } } },
        responses: { "200": ok("OK", Ok), "400": err("Bad locale") },
      },
    },
    "/reenrich": {
      post: {
        summary: "Re-queue tagging and embeddings",
        security: auth,
        requestParams: { query: ReenrichQuery },
        responses: { "200": ok("OK", ReenrichResponse) },
      },
    },
    "/export": {
      get: {
        summary: "Every card, space, membership and link this mind owns",
        security: auth,
        responses: { "200": ok("OK", ExportResponse) },
      },
    },
    "/import": {
      post: {
        summary: "Import a zen export, a card array, bookmark HTML or a CSV",
        security: auth,
        requestBody: {
          content: {
            "application/json": { schema: ImportInput },
            "text/html": { schema: z.string() },
            "text/csv": { schema: z.string() },
          },
        },
        responses: { "201": ok("Created", ImportResponse), "400": err("Invalid import"), "429": err("Daily cap reached") },
      },
    },
    "/upload": {
      post: {
        summary: "Upload a file as a card: multipart directly, or the cloud's ticket-then-PUT flow (JSON)",
        security: auth,
        requestBody: {
          content: {
            "multipart/form-data": {
              schema: z.object({ file: z.string(), title: z.string().optional(), url: z.string().optional(), note: z.string().optional() }),
            },
            "application/json": { schema: z.union([UploadTicketInput, UploadDoneInput]) },
          },
        },
        responses: {
          "200": ok("An upload ticket (cloud only)", UploadTicketResponse),
          "201": ok("Created", CardResponse),
          "400": err("Invalid"),
          "403": err("Not yours"),
          "413": err("Too large"),
          "429": err("Daily cap reached"),
        },
      },
    },
    "/file/{name}": {
      get: {
        summary: "A stored upload's bytes (redirects to storage in the cloud)",
        security: auth,
        requestParams: { path: z.object({ name: z.string() }) },
        responses: { "200": { description: "The file's bytes." }, "404": { description: "Not found." } },
      },
    },
  },
})

await Bun.write("openapi.json", JSON.stringify(document, null, 2) + "\n")
console.log("wrote apps/web/openapi.json")
