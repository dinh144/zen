"use client"

import { DROP_PATH, FACE_MARKUP } from "./drop"

// The page change as one gesture of zen's drop, drawn as liquid:
//   1. the logo's drop leaves home and flies to the middle, stretching as it goes and leaving a wet
//      trail, then lands with a wobble;
//   2. every part of the old page shrinks into a bead that flows into it and merges (a gooey
//      filter makes touching beads one body of ink);
//   3. on the new page, beads bud off the drop and are thrown to each part, which bleeds out of
//      its bead;
//   4. the drop flies home, trail and all, and the logo takes it back with a small bounce.
// Steps 1-2 run before navigating (gather), 3-4 when the new page mounts (scatter).

// The smallest parts that still read as one thing: each link, heading, field, control, card and row.
export const PARTS = [
  "nav a:not(:has([data-drop]))", "nav button", "aside a", "aside button",
  "h1", "h2", "h3", "header input", "header p", "header [role=group]", "header [data-slot=slider]",
  "form", "main > *", "[data-card]", "[data-page] li", "[data-slot=empty]", "canvas", "label",
].join(", ")
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)"
const IN_OUT = "cubic-bezier(0.65, 0, 0.35, 1)"
const HERO_W = 56 // the drop in the middle, in px (the logo's is 18 wide)
const FACE = `<svg viewBox="0 0 24 32" width="100%" height="100%"><path d="${DROP_PATH}" fill="currentColor"/>${FACE_MARKUP.neutral}</svg>`

type Point = { x: number; y: number; w: number }
type Hero = { face: HTMLElement; body: HTMLElement }

let hero: Hero | null = null
const lastRun = new WeakMap<object, number>() // React runs dev effects twice in a row; a revisited page runs again

const calm = () => matchMedia("(prefers-reduced-motion: reduce)").matches
const centre = (): Point => ({ x: innerWidth / 2, y: innerHeight / 2, w: HERO_W })
const logo = () => document.querySelector<HTMLElement>("[data-drop]")
const boxPoint = (box: DOMRect): Point => ({ x: box.left + box.width / 2, y: box.top + box.height / 2, w: box.width })
const home = (): Point => {
  const box = logo()?.getBoundingClientRect()
  return box ? boxPoint(box) : { x: 40, y: 36, w: 18 }
}
const stretchFor = (dx: number, dy: number) => (Math.abs(dy) > Math.abs(dx) ? "scale(0.82, 1.22)" : "scale(1.22, 0.82)")

/** The layer where ink is liquid: blur, then a hard alpha cut, so blobs that touch become one. */
function goo() {
  const found = document.getElementById("ink-goo")
  if (found) return found
  document.body.insertAdjacentHTML(
    "beforeend",
    `<svg aria-hidden="true" width="0" height="0" style="position:absolute"><filter id="zen-goo" color-interpolation-filters="sRGB">
      <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="b"/>
      <feColorMatrix in="b" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10" result="g"/>
      <feComposite in="SourceGraphic" in2="g" operator="atop"/>
    </filter></svg><div id="ink-goo" aria-hidden="true"></div>`,
  )
  return document.getElementById("ink-goo")!
}

/** A round bead of ink in the liquid layer, centred on a point. */
function bead(x: number, y: number, size: number) {
  const el = document.createElement("span")
  el.className = "ink-bead"
  Object.assign(el.style, { left: `${x - size / 2}px`, top: `${y - size / 2}px`, width: `${size}px`, height: `${size}px` })
  goo().append(el)
  return el
}

/** The drop with its face, over its body in the liquid layer (so beads merge into it). Placed at `at`. */
function makeHero(at: Point): Hero {
  const face = document.createElement("span")
  face.className = "ink-hero"
  face.innerHTML = FACE
  Object.assign(face.style, { left: `${at.x - HERO_W / 2}px`, top: `${at.y - (HERO_W * 4) / 3 / 2}px`, width: `${HERO_W}px`, height: `${(HERO_W * 4) / 3}px` })
  document.body.append(face)
  const body = bead(at.x, at.y + HERO_W * 0.12, HERO_W * 0.86)
  return { face, body }
}

/**
 * Flies the hero (placed at the middle) between two points: it stretches along the way, drips a wet
 * trail the goo joins into one stroke, and lands soft. `into` flies from the middle out to `to`.
 */
function flight(h: Hero, from: Point, to: Point, duration: number, into = false) {
  const c = centre()
  const far = into ? to : from
  const dx = far.x - c.x
  const dy = far.y - c.y
  const s = far.w / HERO_W
  const stretch = stretchFor(dx, dy)
  const out = [
    { transform: `translate(${dx}px, ${dy}px) scale(${s})`, offset: 0 },
    { transform: `translate(${dx * 0.55}px, ${dy * 0.55 - 60}px) scale(${(s + 1) / 2}) ${stretch}`, offset: 0.45 },
    { transform: `translate(${dx * 0.08}px, ${dy * 0.08 - 12}px) ${stretch}`, offset: 0.78 },
    { transform: "scale(1.16, 0.86)", offset: 0.88 },
    { transform: "scale(0.95, 1.05)", offset: 0.95 },
    { transform: "none", offset: 1 },
  ]
  const home = [
    { transform: "none", offset: 0 },
    { transform: "scale(1.14, 0.86)", offset: 0.12 },
    { transform: `translate(${dx * 0.45}px, ${dy * 0.45 - 70}px) scale(${(1 + s) / 2}) ${stretch}`, offset: 0.55 },
    { transform: `translate(${dx}px, ${dy}px) scale(${s})`, offset: 1 },
  ]
  const run = [h.face, h.body].map((el) => el.animate(into ? home : out, { duration, easing: IN_OUT, fill: "both" }))
  const trail = setInterval(() => {
    if (!h.face.isConnected) return clearInterval(trail)
    if (document.hidden) return // a background tab holds animations but not timers
    const box = h.face.getBoundingClientRect()
    const drip = bead(box.left + box.width / 2, box.top + box.height * 0.62, Math.max(6, box.width * 0.42))
    drip.animate([{ transform: "scale(1)" }, { transform: "scale(0)" }], { duration: 420, easing: "ease-in", fill: "forwards" }).finished.finally(() => drip.remove()).catch(() => {})
  }, 28)
  setTimeout(() => clearInterval(trail), duration + 200)
  // A flight cut short (cancelled) rejects: the trail must stop either way.
  return run[0]!.finished.catch(() => {}).finally(() => clearInterval(trail))
}

/** A slow breath while it waits, so a slow page never looks stuck. */
function breathe(h: Hero) {
  for (const el of [h.face, h.body]) {
    el.animate([{ scale: "1" }, { scale: "1.06 0.95" }, { scale: "1" }], { duration: 1500, iterations: Infinity, easing: "ease-in-out", composite: "add" })
  }
}

/** It swells as it swallows a bead (or shrinks a little as it throws one). */
function gulp(h: Hero | null, big = 1.1) {
  for (const el of h ? [h.face, h.body] : []) {
    el.animate([{ scale: "1" }, { scale: `${big} ${2 - big}` }, { scale: "1" }], { duration: 260, easing: EASE, composite: "add" })
  }
}

function parts(root: ParentNode) {
  const seen: Element[] = []
  const out: { el: HTMLElement; box: DOMRect }[] = []
  for (const el of root.querySelectorAll<HTMLElement>(PARTS)) {
    if (seen.some((parent) => parent.contains(el))) continue
    const box = el.getBoundingClientRect()
    if (box.bottom < 0 || box.top > innerHeight || box.left > innerWidth || box.width < 4 || box.height < 4) continue
    seen.push(el)
    out.push({ el, box })
  }
  return out
}

const beadSize = (box: DOMRect) => Math.max(10, Math.min(30, Math.min(box.width, box.height) * 0.3))

/** Steps 1-2: the drop comes to the middle and drinks the page. Resolves when it has. */
export async function gather() {
  if (calm()) return
  hero?.face.remove()
  hero?.body.remove()
  const c = centre()
  const from = home()
  logo()?.style.setProperty("visibility", "hidden")
  const h = (hero = makeHero(c))
  const going = flight(h, from, c, 760)

  const list = parts(document)
  list.forEach(({ el, box }, index) => {
    const delay = 260 + Math.min(index, 28) * 26
    const p = boxPoint(box)
    el.animate(
      [
        { clipPath: "circle(75% at 50% 50%)", filter: "none", opacity: 1 },
        { clipPath: "circle(0% at 50% 50%)", filter: "blur(8px) saturate(0.2)", opacity: 0 },
      ],
      { duration: 520, delay, easing: IN_OUT, fill: "forwards" },
    )
    // The part's ink pools into a bead where it was, then runs to the drop and is swallowed.
    const b = bead(p.x, p.y, beadSize(box))
    b.animate(
      [
        { transform: "scale(0)" },
        { transform: "scale(1.2)", offset: 0.25 },
        { transform: `translate(${(c.x - p.x) * 0.5}px, ${(c.y - p.y) * 0.5 + 24}px) scale(1)`, offset: 0.6 },
        { transform: `translate(${c.x - p.x}px, ${c.y - p.y}px) scale(0.7)`, offset: 0.94 },
        { transform: `translate(${c.x - p.x}px, ${c.y - p.y}px) scale(0.2)` },
      ],
      { duration: 900, delay: delay + 160, easing: IN_OUT, fill: "both" },
    ).finished.then(
      () => {
        b.remove()
        gulp(hero)
      },
      () => b.remove(),
    )
  })
  await going
  await new Promise((resolve) => setTimeout(resolve, Math.max(0, 260 + Math.min(list.length, 28) * 26 + 160 + 900 - 760)))
  if (hero === h) breathe(h)
  // Safety net: if no page takes the drop (a failed or cancelled navigation), it goes home anyway.
  setTimeout(() => {
    if (hero !== h) return
    hero = null
    goHome(h)
  }, 5000)
}

/** Steps 3-4, on the new page: beads bud off the drop to every part, the parts bleed out, the drop goes home. */
export function scatter(root: ParentNode, tries = 0) {
  // A revisited page is revealed a frame after its effects run: wait until it has a size to measure.
  if (root instanceof Element && !root.getBoundingClientRect().height && tries < 120) {
    setTimeout(() => scatter(root, tries + 1), 16)
    return
  }
  const now = performance.now()
  if (now - (lastRun.get(root) ?? -1e9) < 600) return
  lastRun.set(root, now)
  // A revisited page is the same DOM that was gathered: undo that before it is born again.
  if (root instanceof Element) root.getAnimations({ subtree: true }).forEach((animation) => animation.cancel())
  // The new page's logo stays empty until the drop comes home to it.
  logo()?.style.setProperty("visibility", "hidden")
  if (calm()) {
    hero?.face.remove()
    hero?.body.remove()
    hero = null
    logo()?.style.removeProperty("visibility")
    return
  }
  const c = centre()
  let lead = 0
  let h = hero
  if (h) {
    for (const el of [h.face, h.body]) el.getAnimations().forEach((animation) => animation.cancel())
  } else {
    // The first page has no gathered drop: the logo's drop comes to the middle first.
    h = makeHero(c)
    void flight(h, home(), c, 760)
    lead = 780
  }
  hero = null
  const mine = h

  const list = parts(root)
  const flightTime = 620
  list.forEach(({ el }, index) => {
    const delay = lead + 140 + Math.min(index, 28) * 55
    // Hidden until its bead lands; where it sits is read only then (scroll and images settle first).
    const hide = el.animate([{ opacity: 0 }, { opacity: 0 }], { duration: delay + flightTime + 400 })
    setTimeout(() => {
      const box = el.getBoundingClientRect()
      const p = boxPoint(box)
      const dx = p.x - c.x
      const dy = p.y - c.y
      const b = bead(c.x, c.y + 6, beadSize(box))
      gulp(mine, 0.92)
      // Budding: the bead swells out of the drop's side (the goo keeps it joined), then is thrown.
      b.animate(
        [
          { transform: "scale(0.5)" },
          { transform: `translate(${Math.sign(dx) * 18}px, ${Math.sign(dy) * 18}px) scale(1.1)`, offset: 0.2 },
          { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 50}px) ${stretchFor(dx, dy)}`, offset: 0.6 },
          { transform: `translate(${dx}px, ${dy}px) scale(1.3, 0.75)`, offset: 0.9 },
          { transform: `translate(${dx}px, ${dy}px)` },
        ],
        { duration: flightTime, easing: IN_OUT, fill: "both" },
      )
      // Landed: the bead soaks into the paper as the part bleeds out of it, from the very spot.
      b.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: `translate(${dx}px, ${dy}px) scale(0)` }], {
        duration: 520,
        delay: flightTime + 80,
        easing: "cubic-bezier(0.5, 0, 0.75, 0)",
        fill: "forwards",
      }).finished.finally(() => b.remove()).catch(() => {})
      setTimeout(() => {
        hide.cancel()
        el.animate(
          [
            { clipPath: "circle(0% at 50% 50%)", opacity: 0, filter: "blur(10px) saturate(0.2)" },
            { clipPath: "circle(14% at 50% 50%)", opacity: 1, filter: "blur(5px) saturate(0.5)", offset: 0.28 },
            { clipPath: "circle(75% at 50% 50%)", opacity: 1, filter: "none" },
          ],
          { duration: 1200, easing: EASE, fill: "backwards" },
        )
      }, flightTime - 60)
    }, delay)
  })

  // Home: once the last bead has left, the drop flies back to the logo.
  setTimeout(() => goHome(mine), lead + 140 + Math.min(list.length, 28) * 55 + 380)
}

/** The drop flies from the middle back into the logo's place, and the logo takes it with a bounce. */
function goHome(h: Hero) {
  if (!h.face.isConnected) return
  for (const el of [h.face, h.body]) el.getAnimations().forEach((animation) => animation.cancel())
  void flight(h, centre(), home(), 820, true).then(() => {
    h.face.remove()
    h.body.remove()
    // Another drop is already out on a newer page change: the logo stays empty for that one.
    if (hero) return
    const mark = logo()
    mark?.style.removeProperty("visibility")
    mark?.animate([{ scale: "1.5 0.7" }, { scale: "0.9 1.12" }, { scale: "1" }], { duration: 520, easing: EASE })
  })
}
