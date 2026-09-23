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

// CPU inference is slow; enrichment runs after the response, so it can wait.
const TIMEOUT = Number(process.env.OLLAMA_TIMEOUT_MS ?? 180_000)

export type Enrichment = {
  kind?: string
  title?: string
  summary?: string
  tags: string[]
  colors: string[]
  text?: string
}

const PROMPT = `You tag items saved to a personal visual memory.
Reply with JSON only: {"kind":"..","title":"..","summary":"..","tags":[".."],"colors":["#hex"],"text":".."}
kind: one of note,quote,link,article,image,video,product,book,movie,recipe,tweet,person,color,font,pdf,file
title: short, human. summary: one sentence.
tags: 4-10 lowercase words a person would search by - objects, style, mood, topic, colour names.
If the item is in Vietnamese, give the tags in Vietnamese AND their English equivalents, so it can be found in either language.
colors: up to 5 dominant colours as hex, most dominant first. [] for text-only items.
text: every word legible inside the image (OCR), else "".`

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
    }
  } catch {
    return null
  }
}

async function generate(model: string, prompt: string, images?: string[]) {
  if (GEMINI_KEY) {
    const json = await post(`/models/${GEMINI_MODEL}:generateContent`, {
      contents: [{ parts: [{ text: prompt }, ...(images ?? []).map((data) => ({ inline_data: { mime_type: "image/jpeg", data } }))] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
    })
    return parse(json?.candidates?.[0]?.content?.parts?.[0]?.text)
  }
  const json = await post("/api/generate", {
    model,
    prompt,
    images,
    format: "json",
    stream: false,
    options: { temperature: 0.2 },
  })
  return parse(json?.response)
}

export function enrichText(input: string) {
  return generate(TEXT, `${PROMPT}\n\nITEM:\n${input.slice(0, 8000)}`)
}

export function enrichImage(base64: string, _mime: string, context = "") {
  return generate(VISION, `${PROMPT}\n\nCONTEXT:\n${context.slice(0, 1500)}`, [base64])
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
