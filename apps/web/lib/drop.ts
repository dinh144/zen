// The drop is zen's face. Twelve inks, sixteen moods.
export const INKS = {
  sumi: "#1a1a18",
  earth: "#8b5a2b",
  vermilion: "#b23a2f",
  persimmon: "#e07a35",
  saffron: "#d9a227",
  moss: "#4f7d52",
  jade: "#2f8f7f",
  indigo: "#3a5ca8",
  wisteria: "#7a5cad",
  plum: "#b8508a",
  stone: "#8a8478",
  shell: "#d9cfbc",
} as const

export type Ink = keyof typeof INKS

const rgb = (hex: string) => [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16))
const luminance = (hex: string) => {
  const [r, g, b] = rgb(hex).map((value) => {
    const c = value / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}
export const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi! + 0.05) / (lo! + 0.05)
}
const toHsl = (hex: string) => {
  const [r, g, b] = rgb(hex).map((value) => value / 255) as [number, number, number]
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h / 6, s, l]
}
const fromHsl = ([h, s, l]: number[]) => {
  const q = l! < 0.5 ? l! * (1 + s!) : l! + s! - l! * s!
  const p = 2 * l! - q
  const channel = (t: number) => {
    t = (t + 1) % 1
    return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p
  }
  return `#${[h! + 1 / 3, h!, h! - 1 / 3].map((t) => Math.round((s ? channel(t) : l!) * 255).toString(16).padStart(2, "0")).join("")}`
}

/** An ink as text: same hue, darker on paper or lighter at night, until it clears AA on page and sheet. */
function readable(ink: string, surfaces: string[], step: number) {
  const [h, s, l] = toHsl(ink)
  for (let light = l!; light >= 0 && light <= 1; light += step) {
    const candidate = fromHsl([h!, s!, light])
    if (surfaces.every((surface) => contrast(candidate, surface) >= 4.6)) return candidate
  }
  return step < 0 ? "#1a1a18" : "#efe9dc"
}

const each = (surfaces: string[], step: number) =>
  Object.fromEntries(Object.entries(INKS).map(([name, hex]) => [name, readable(hex, surfaces, step)])) as Record<Ink, string>

/** The chosen ink as --primary, once for paper and once for night. */
export const INK_TEXT = {
  light: each(["#f4f1ea", "#fbf9f4"], -0.01),
  dark: each(["#14120f", "#1c1a16"], 0.01),
}

export const EXPRESSIONS = [
  "neutral",
  "attentive",
  "surprised",
  "excited",
  "happy",
  "laughing",
  "angry",
  "sad",
  "scared",
  "suspicious",
  "confused",
  "curious",
  "proud",
  "shy",
  "unimpressed",
  "sleepy",
] as const

export type Expression = (typeof EXPRESSIONS)[number]

export const DROP_PATH =
  "M12 1.5c0 0 9.2 11.4 9.2 18.1C21.2 25.9 17.1 30.5 12 30.5S2.8 25.9 2.8 19.6C2.8 12.9 12 1.5 12 1.5Z"

export function dropDataUri(ink: Ink, expression: Expression = "neutral") {
  const face = FACE_MARKUP[expression]
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 32"><path d="${DROP_PATH}" fill="${INKS[ink]}"/>${face}</svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

/** Plain-string faces for the favicon; the component draws the same shapes. */
const eye = (x: number, y = 19, w = 2.5, h = 5, r = 1.25) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="white"/>`
const round = (x: number, y = 20.5, r = 1.9) => `<circle cx="${x}" cy="${y}" r="${r}" fill="white"/>`
const arc = (x: number, up = true, y = 21) =>
  `<path d="M${x - 2.1} ${y} q2.1 ${up ? -3 : 3} 4.2 0" stroke="white" stroke-width="1.5" fill="none" stroke-linecap="round"/>`
const line = (x: number, y = 21) =>
  `<path d="M${x - 2} ${y} h4" stroke="white" stroke-width="1.5" stroke-linecap="round"/>`
const mouth = (d: string) => `<path d="${d}" stroke="white" stroke-width="1.3" fill="none" stroke-linecap="round"/>`

export const FACE_MARKUP: Record<Expression, string> = {
  neutral: eye(7.6) + eye(13.9),
  attentive: eye(7.4, 18, 2.5, 6.2) + eye(14.1, 18, 2.5, 6.2),
  surprised: round(9) + round(15) + mouth("M10.6 26 q1.4 1.6 2.8 0"),
  excited: arc(9) + arc(15) + mouth("M9.6 25.4 q2.4 2.6 4.8 0"),
  happy: arc(9) + arc(15),
  laughing: arc(9) + arc(15) + mouth("M9.2 25 q2.8 3 5.6 0 z"),
  angry:
    `<path d="M6.6 17.2 l3.6 1.8" stroke="white" stroke-width="1.4" stroke-linecap="round"/>` +
    `<path d="M17.4 17.2 l-3.6 1.8" stroke="white" stroke-width="1.4" stroke-linecap="round"/>` +
    eye(7.9, 20.4, 2.2, 3, 1.1) + eye(13.9, 20.4, 2.2, 3, 1.1) + mouth("M10.4 26.2 h3.2"),
  sad: arc(9, false, 20.4) + arc(15, false, 20.4) + mouth("M10.2 26.4 q1.8 -1.8 3.6 0"),
  scared: round(9, 20, 2.2) + round(15, 20, 2.2) + mouth("M10 26 q0.9 -1.2 1.8 0 q0.9 1.2 1.8 0"),
  suspicious: line(9, 18.2) + line(15, 18.2) + eye(7.9, 20.2, 2.4, 2.4, 1.2) + eye(13.7, 20.2, 2.4, 2.4, 1.2),
  confused: round(8.9, 20.4, 1.8) + line(15.2, 19.4) + eye(14.1, 20.6, 2.2, 2.2, 1.1) + mouth("M10.2 26.4 q1 -1.2 1.9 0 q0.9 1.2 1.9 0"),
  curious: round(8.8, 20, 2.2) + round(15.2, 20.6, 1.4),
  proud: arc(9) + arc(15) + mouth("M10 25.8 q2.2 1.4 4 -0.6"),
  shy: arc(8.8, true, 20.6) + arc(15.2, true, 20.6) +
    `<circle cx="6.4" cy="23.4" r="1.2" fill="white" opacity="0.45"/><circle cx="17.6" cy="23.4" r="1.2" fill="white" opacity="0.45"/>`,
  unimpressed: line(9, 20.4) + line(15, 20.4) + mouth("M10.4 25.8 h3.2"),
  sleepy: arc(9, false, 20) + arc(15, false, 20) + mouth("M10.6 25.6 q1.4 1.4 2.8 0"),
}

/** Every kind of card carries its own ink. */
export const KIND_INK: Record<string, Ink> = {
  note: "sumi",
  quote: "vermilion",
  link: "indigo",
  article: "earth",
  image: "jade",
  video: "plum",
  pdf: "stone",
  product: "persimmon",
  book: "saffron",
  movie: "wisteria",
  recipe: "moss",
  tweet: "jade",
  person: "earth",
  color: "shell",
  font: "stone",
  file: "stone",
}
