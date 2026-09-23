// Tagging, OCR, summaries and embeddings. Gemini when GEMINI_API_KEY is set (the cloud),
// Ollama on localhost otherwise. If either is unreachable every function degrades
// to null instead of throwing, and capture still works.
const HOST = process.env.OLLAMA_HOST ?? "http://localhost:11434"
const VISION = process.env.OLLAMA_VISION_MODEL ?? "qwen2.5vl:3b"
const TEXT = process.env.OLLAMA_TEXT_MODEL ?? "qwen2.5:3b"
const EMBED = process.env.OLLAMA_EMBED_MODEL ?? "bge-m3"

const GEMINI_KEY = process.env.GEMINI_API_KEY
const GEMINI = process.env.GEMINI_BASE_URL ?? "https://generativelanguage.googleapis.com/v1beta"
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-3.8-flash"
// Resolution, answers and grilling: judgment over volume.
const GEMINI_REASON_MODEL = process.env.GEMINI_REASON_MODEL ?? GEMINI_MODEL

// CPU inference is slow; enrichment runs after the response, so it can wait.
const TIMEOUT = Number(process.env.OLLAMA_TIMEOUT_MS ?? 180_000)

export type Enrichment = {
  kind?: string
  title?: string
  summary?: string
  tags: string[]
  colors: string[]
  text?: string
  when?: string
}

/**
 * How every sentence zen writes should read (after blader/humanizer, from Wikipedia's "Signs of AI
 * writing"): the point stated plainly, every fact kept, nothing added.
 */
export const STYLE = `Write like a careful person, in plain words: state the point directly.
Never: "not X but Y" contrasts; one-line closers or dramatic fragments; em or en dashes; lists of three for rhythm;
inflated significance (pivotal, crucial, testament, landscape, vibrant, showcase, delve, underscore); sales language;
chat wrappers ("Great question", "I hope this helps", offers to do more); bold labels; hedges stacked on hedges.
Keep every fact from the source and add none.`

/** The enrichment prompt, in the person's language: titles and summaries they read, tags that find it in any. */
const PROMPT = (lang: string) => `You tag items saved to a personal visual memory.
Reply with JSON only: {"kind":"..","title":"..","summary":"..","tags":[".."],"colors":["#hex"],"text":"..","when":""}
kind: one of note,quote,link,article,image,video,product,book,movie,recipe,tweet,person,color,font,pdf,file
title: short, human, written in ${lang}. summary: one sentence, written in ${lang}, following: ${STYLE}
tags: 4-10 lowercase words a person would search by - objects, brands and logos you can see, setting, style, mood, topic, colour names - in ${lang},
plus their English equivalents, plus the item's own language if it is a third one, so it is found in any of them.
colors: up to 5 dominant colours as hex, most dominant first. [] for text-only items.
text: every word legible inside the image (OCR), else "".
when: if the item is tied to a date (a ticket, booking, event, deadline, appointment, receipt due date), that date as YYYY-MM-DD; else "". Today is ${new Date().toISOString().slice(0, 10)}.`

async function post(path: string, body: unknown) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT)
  try {
    const res = await fetch(GEMINI_KEY ? `${GEMINI}${path}` : `${HOST}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", ...(GEMINI_KEY ? { "x-goog-api-key": GEMINI_KEY } : {}) },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    return res.ok ? await res.json() : null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

export async function aiEnabled() {
  if (GEMINI_KEY) return true
  try {
    const res = await fetch(`${HOST}/api/tags`, { signal: AbortSignal.timeout(2000) })
    return res.ok
  } catch {
    return false
  }
}

function parse(raw: string | undefined): Enrichment | null {
  if (!raw) return null
  const json = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1)
  try {
    const parsed = JSON.parse(json)
    return {
      kind: parsed.kind,
      title: parsed.title,
      summary: parsed.summary,
      tags: Array.isArray(parsed.tags) ? parsed.tags.map(String).slice(0, 12) : [],
      colors: Array.isArray(parsed.colors) ? parsed.colors.map(String).slice(0, 5) : [],
      text: typeof parsed.text === "string" ? parsed.text : "",
      when: typeof parsed.when === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.when) ? parsed.when : undefined,
    }
  } catch {
    return null
  }
}

/** One model call, raw JSON text back. `reason` picks the stronger cloud model for judgment work. */
async function generateRaw(model: string, prompt: string, images?: string[], reason = false) {
  if (GEMINI_KEY) {
    const json = await post(`/models/${reason ? GEMINI_REASON_MODEL : GEMINI_MODEL}:generateContent`, {
      contents: [{ parts: [{ text: prompt }, ...(images ?? []).map((data) => ({ inline_data: { mime_type: "image/jpeg", data } }))] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
    })
    return json?.candidates?.[0]?.content?.parts?.[0]?.text as string | undefined
  }
  const json = await post("/api/generate", {
    model,
    prompt,
    images,
    format: "json",
    stream: false,
    options: { temperature: 0.2 },
  })
  return json?.response as string | undefined
}

async function generate(model: string, prompt: string, images?: string[]) {
  return parse(await generateRaw(model, prompt, images))
}

/** Any structured answer: the prompt names the JSON shape, the caller checks what it needs. */
export async function generateJson<T>(prompt: string, { reason = false } = {}): Promise<T | null> {
  const raw = await generateRaw(TEXT, prompt, undefined, reason)
  if (!raw) return null
  const start = raw.search(/[[{]/)
  const end = Math.max(raw.lastIndexOf("}"), raw.lastIndexOf("]"))
  try {
    return JSON.parse(raw.slice(start, end + 1)) as T
  } catch {
    return null
  }
}

export function enrichText(input: string, lang = "Vietnamese") {
  return generate(TEXT, `${PROMPT(lang)}\n\nITEM:\n${input.slice(0, 8000)}`)
}

export function enrichImage(base64: string, _mime: string, context = "", lang = "Vietnamese") {
  return generate(VISION, `${PROMPT(lang)}\n\nCONTEXT:\n${context.slice(0, 1500)}`, [base64])
}

/** 1024 wide either way, so the same pgvector column serves bge-m3 locally and Gemini in the cloud. */
export async function embed(text: string, task: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY" = "RETRIEVAL_DOCUMENT") {
  if (!text.trim()) return null
  if (GEMINI_KEY) {
    const json = await post("/models/gemini-embedding-001:embedContent", {
      model: "models/gemini-embedding-001",
      content: { parts: [{ text: text.slice(0, 8000) }] },
      taskType: task,
      outputDimensionality: 1024,
    })
    return (json?.embedding?.values as number[] | undefined) ?? null
  }
  const json = await post("/api/embed", { model: EMBED, input: text.slice(0, 8000) })
  const values: number[] | undefined = json?.embeddings?.[0]
  return values ?? null
}

/** Voice → card: the words as spoken, in the language spoken. Cloud only (Gemini hears audio). */
export async function transcribe(base64: string, mime: string) {
  if (!GEMINI_KEY) return null
  const json = await post(`/models/${GEMINI_MODEL}:generateContent`, {
    contents: [
      {
        parts: [
          { text: "Transcribe this voice note exactly, in the language it is spoken in. Reply with the transcript only." },
          { inline_data: { mime_type: mime, data: base64 } },
        ],
      },
    ],
  })
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text as string | undefined
  return text?.trim() || null
}
