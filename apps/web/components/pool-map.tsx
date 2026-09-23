"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type Simulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force"
import { CardDetail } from "@/components/card-detail"
import { imageOf } from "@/components/card-tile"
import { useDrop } from "@/components/drop-state"
import { useT } from "@/components/locale"
import { INK_TEXT } from "@/lib/drop"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@workspace/ui/components/tooltip"
import { fresh, morph } from "@/lib/morph"
import type { Card, Space } from "@/lib/types"
import type { ClusterView } from "@/lib/clusters"
import type { Reply } from "@/lib/agent"

type Edge = { from_id: string; to_id: string; kind: "tie" | "entity" | "near" }
type Node = SimulationNodeDatum & {
  card: Card
  cluster: number
  r: number
  degree: number
  fade: number
  image?: HTMLImageElement
  /** The tile this node grew out of, in map units, while the morph from the board runs. */
  from?: { w: number; h: number }
}
type Link = SimulationLinkDatum<Node> & { kind: Edge["kind"] }

const LOOSE = -1
// Cluster colours, in the order clusters come (biggest first). Loose cards are stone.
const PALETTE = ["indigo", "jade", "persimmon", "wisteria", "moss", "plum", "saffron", "vermilion", "earth"] as const
const DISTANCE = { tie: 46, entity: 64, near: 84 }
const PULL = { tie: 0.5, entity: 0.25, near: 0.08 }
const clamp = (value: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, value))

export function PoolMap({
  cards: initialCards,
  clusters,
  edges,
  spaces,
}: {
  cards: Card[]
  clusters: ClusterView[]
  edges: Edge[]
  spaces: Space[]
}) {
  const t = useT()
  const router = useRouter()
  const { feel, rest } = useDrop()
  const canvas = React.useRef<HTMLCanvasElement>(null)
  const peek = React.useRef<HTMLDivElement>(null)
  const [cards, setCards] = React.useState(initialCards)
  const [open, setOpen] = React.useState<Card | null>(null)
  const [query, setQuery] = React.useState("")
  const [matches, setMatches] = React.useState<Set<string> | null>(null)
  const [reply, setReply] = React.useState<(Reply & { question: string }) | null>(null)
  const [thinking, setThinking] = React.useState(false)
  const [kept, setKept] = React.useState(false)
  const [peeked, setPeeked] = React.useState<Card | null>(null)
  const [phone, setPhone] = React.useState(false)
  const cited = React.useRef<string[]>([])
  // The view eases toward `goal`; wheel and pan move both, fit and focus move only the goal.
  const view = React.useRef({ x: 0, y: 0, k: 0.6 })
  const goal = React.useRef({ x: 0, y: 0, k: 0.6 })
  const nodes = React.useRef<Node[]>([])
  const links = React.useRef<Link[]>([])
  const near = React.useRef(new Map<string, Set<string>>())
  const lit = React.useRef<Set<string> | null>(null) // what is highlighted: a hovered node and its neighbours, or a group
  const hover = React.useRef<Node | null>(null)
  const simulation = React.useRef<Simulation<Node, Link> | null>(null)
  const dirty = React.useRef(true)
  const grown = React.useRef(0) // when the tiles-to-nodes morph started
  const colours = React.useRef({ paper: "#f4f1ea", line: "#ded7c8", muted: "#6f6a5f", ink: "#1a1a18", primary: "#b23a2f", dark: false })

  React.useEffect(() => rest("neutral"), [rest])
  React.useEffect(() => {
    const media = matchMedia("(max-width: 640px)")
    const update = () => setPhone(media.matches)
    update()
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])

  const clusterOf = React.useMemo(() => {
    const map = new Map<string, number>()
    clusters.forEach((cluster, index) => cluster.card_ids.forEach((id) => map.set(id, index)))
    return map
  }, [clusters])

  // Theme tokens, read again when day and night switch.
  React.useEffect(() => {
    const read = () => {
      const style = getComputedStyle(document.documentElement)
      const token = (name: string, fallback: string) => style.getPropertyValue(name).trim().slice(0, 7) || fallback
      colours.current = {
        paper: token("--background", "#f4f1ea"),
        line: token("--border", "#ded7c8"),
        muted: token("--muted-foreground", "#6f6a5f"),
        ink: token("--foreground", "#1a1a18"),
        primary: token("--primary", "#b23a2f"),
        dark: document.documentElement.classList.contains("dark"),
      }
      dirty.current = true
    }
    read()
    const watch = new MutationObserver(read)
    watch.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style"] })
    return () => watch.disconnect()
  }, [])

  const colourOf = React.useCallback((node: Node) => {
    const inks = INK_TEXT[colours.current.dark ? "dark" : "light"]
    return node.cluster === LOOSE ? inks.stone : inks[PALETTE[node.cluster % PALETTE.length]!]
  }, [])

  // Fits the goal around some nodes (all of them by default), leaving room for the ask bar.
  const fit = React.useCallback((only?: Set<string>) => {
    const el = canvas.current
    const list = nodes.current.filter((node) => !only || only.has(node.card.id))
    if (!el || !list.length) return
    const xs = list.map((node) => node.x ?? 0)
    const ys = list.map((node) => node.y ?? 0)
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
    const { width, height } = el.getBoundingClientRect()
    const k = clamp(Math.min((width - 160) / (x1 - x0 + 80), (height - 320) / (y1 - y0 + 80)), 0.25, 2.4)
    goal.current = { k, x: -((x0 + x1) / 2) * k, y: -((y0 + y1) / 2) * k - 30 }
    dirty.current = true
  }, [])

  // The graph lives: nodes bloom out of the middle, settle, and answer to a drag the way Obsidian's do.
  React.useEffect(() => {
    if (phone) return
    const calm = matchMedia("(prefers-reduced-motion: reduce)").matches
    // The graph opens out of one drop in the middle: every node starts in a small spiral there.
    const list: Node[] = cards.map((card, index) => ({
      card,
      cluster: clusterOf.get(card.id) ?? LOOSE,
      r: 4,
      degree: 0,
      fade: 1,
      x: Math.cos(index * 2.4) * Math.sqrt(index) * 4,
      y: Math.sin(index * 2.4) * Math.sqrt(index) * 4,
    }))
    const byId = new Map(list.map((node) => [node.card.id, node]))
    const neighbours = new Map<string, Set<string>>(list.map((node) => [node.card.id, new Set()]))
    const seen = new Set<string>()
    const ties: Link[] = []
    for (const edge of edges) {
      const [a, b] = [byId.get(edge.from_id), byId.get(edge.to_id)]
      const key = [edge.from_id, edge.to_id].sort().join()
      if (!a || !b || seen.has(key)) continue
      seen.add(key)
      ties.push({ source: a, target: b, kind: edge.kind })
      neighbours.get(a.card.id)!.add(b.card.id)
      neighbours.get(b.card.id)!.add(a.card.id)
    }
    // Arriving from the board: each tile on screen becomes its node, starting where the tile was.
    const el = canvas.current
    if (el && fresh() && morph.tiles.size) {
      const { width, height } = el.getBoundingClientRect()
      const { x, y, k } = view.current
      for (const node of list) {
        const box = morph.tiles.get(node.card.id)
        if (!box) continue
        node.x = (box.left + box.width / 2 - width / 2 - x) / k
        node.y = (box.top + box.height / 2 - height / 2 - y) / k
        node.from = { w: box.width / k, h: box.height / k }
      }
      grown.current = performance.now()
    }
    for (const node of list) {
      node.degree = neighbours.get(node.card.id)!.size
      node.r = 3.5 + Math.sqrt(node.degree) * 2.2
    }
    // A soft pull toward each cluster's own middle keeps groups together without fencing them in.
    const centres = new Map<number, { x: number; y: number }>()
    const gather = (alpha: number) => {
      centres.clear()
      const sums = new Map<number, { x: number; y: number; n: number }>()
      for (const node of list) {
        if (node.cluster === LOOSE) continue
        const sum = sums.get(node.cluster) ?? { x: 0, y: 0, n: 0 }
        sum.x += node.x ?? 0
        sum.y += node.y ?? 0
        sum.n++
        sums.set(node.cluster, sum)
      }
      for (const [cluster, sum] of sums) centres.set(cluster, { x: sum.x / sum.n, y: sum.y / sum.n })
      for (const node of list) {
        const centre = centres.get(node.cluster)
        if (!centre) continue
        node.vx = (node.vx ?? 0) + (centre.x - (node.x ?? 0)) * alpha * 0.08
        node.vy = (node.vy ?? 0) + (centre.y - (node.y ?? 0)) * alpha * 0.08
      }
    }
    const sim = forceSimulation(list)
      .velocityDecay(0.35)
      .force("link", forceLink<Node, Link>(ties).distance((link) => DISTANCE[link.kind]).strength((link) => PULL[link.kind]))
      .force("charge", forceManyBody<Node>().strength(-150).distanceMax(520))
      .force("x", forceX<Node>(0).strength(0.035))
      .force("y", forceY<Node>(0).strength(0.035))
      .force("collide", forceCollide<Node>((node) => node.r + 3))
      .force("gather", gather)
      .on("tick", () => void (dirty.current = true))
    if (calm) sim.stop().tick(320)
    for (const node of list) {
      const src = imageOf(node.card)
      if (!src) continue
      const image = new Image()
      image.src = src
      node.image = image
    }
    nodes.current = list
    links.current = ties
    near.current = neighbours
    simulation.current = sim
    dirty.current = true
    // Once the bloom has mostly settled, frame the whole mind.
    const framing = setTimeout(() => fit(), calm ? 0 : 1400)
    return () => {
      clearTimeout(framing)
      sim.stop()
      // Leaving: the nodes on screen are handed to the board, which grows its tiles back out of them.
      // The canvas fills the window (it may already be detached here, so no measuring it).
      const box = { width: innerWidth, height: innerHeight }
      const { x, y, k } = view.current
      morph.nodes.clear()
      for (const node of list) {
        const sx = box.width / 2 + x + (node.x ?? 0) * k
        const sy = box.height / 2 + y + (node.y ?? 0) * k
        if (sx > 0 && sy > 0 && sx < box.width && sy < box.height) morph.nodes.set(node.card.id, { x: sx, y: sy, r: node.r * k })
      }
    }
  }, [cards, clusterOf, edges, phone, fit])

  // One frame loop: ease the view and the fades, draw only when something changed.
  React.useEffect(() => {
    if (phone) return
    let frame = 0
    const calm = matchMedia("(prefers-reduced-motion: reduce)").matches
    const ease = calm ? 1 : 0.18
    const paint = () => {
      frame = requestAnimationFrame(paint)
      const el = canvas.current
      if (!el) return
      const v = view.current
      const g = goal.current
      if (Math.abs(g.k - v.k) > 0.0005 || Math.abs(g.x - v.x) > 0.1 || Math.abs(g.y - v.y) > 0.1) {
        v.k += (g.k - v.k) * ease
        v.x += (g.x - v.x) * ease
        v.y += (g.y - v.y) * ease
        dirty.current = true
      }
      const focus = lit.current ?? matches
      for (const node of nodes.current) {
        const want = !focus || focus.has(node.card.id) ? 1 : 0.1
        if (Math.abs(want - node.fade) > 0.01) {
          node.fade += (want - node.fade) * (calm ? 1 : 0.2)
          dirty.current = true
        }
      }
      if (!dirty.current) return
      dirty.current = false

      const ctx = el.getContext("2d")
      if (!ctx) return
      const ratio = devicePixelRatio || 1
      const { width, height } = el.getBoundingClientRect()
      if (el.width !== Math.round(width * ratio) || el.height !== Math.round(height * ratio)) {
        el.width = Math.round(width * ratio)
        el.height = Math.round(height * ratio)
      }
      const { line, muted, ink, primary, paper } = colours.current
      const { x, y, k } = v
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
      ctx.clearRect(0, 0, width, height)
      ctx.translate(width / 2 + x, height / 2 + y)
      ctx.scale(k, k)

      const active = hover.current
      // Edges: hairlines; the ones touching the hovered node take its colour.
      for (const link of links.current) {
        const a = link.source as Node
        const b = link.target as Node
        const touching = active && (a === active || b === active)
        ctx.globalAlpha = touching ? 0.95 : Math.min(a.fade, b.fade) * (link.kind === "near" ? 0.35 : 0.6)
        ctx.strokeStyle = touching ? colourOf(active) : link.kind === "tie" ? primary : line
        ctx.lineWidth = (touching ? 1.6 : link.kind === "tie" ? 1.2 : 0.8) / Math.sqrt(k)
        ctx.beginPath()
        ctx.moveTo(a.x ?? 0, a.y ?? 0)
        ctx.lineTo(b.x ?? 0, b.y ?? 0)
        ctx.stroke()
      }

      // An answer draws a line from the middle of the view to each card it came from.
      if (cited.current.length) {
        ctx.globalAlpha = 0.8
        ctx.strokeStyle = primary
        ctx.lineWidth = 1.4 / k
        ctx.setLineDash([4 / k, 4 / k])
        const cx = -x / k
        const cy = -y / k + height / 2 / k - 120 / k
        for (const node of nodes.current) {
          if (!cited.current.includes(node.card.id)) continue
          ctx.beginPath()
          ctx.moveTo(cx, cy)
          ctx.lineTo(node.x ?? 0, node.y ?? 0)
          ctx.stroke()
        }
        ctx.setLineDash([])
      }

      // Nodes: a dot in the cluster's colour, a ring of paper so crossings stay readable.
      // Just after arriving from the board, each starts as its tile and melts into the dot.
      const melt = clamp((performance.now() - grown.current) / 900, 0, 1)
      const eased = melt < 0.5 ? 4 * melt ** 3 : 1 - (-2 * melt + 2) ** 3 / 2
      if (melt < 1) dirty.current = true
      for (const node of nodes.current) {
        const grow = node === active ? 1.35 : 1
        const nx = node.x ?? 0
        const ny = node.y ?? 0
        ctx.globalAlpha = node.fade
        if (node.from && melt < 1) {
          const w = node.from.w + (node.r * 2 - node.from.w) * eased
          const h = node.from.h + (node.r * 2 - node.from.h) * eased
          const round = Math.min(w, h) / 2 * eased
          ctx.beginPath()
          ctx.roundRect(nx - w / 2, ny - h / 2, w, h, round)
          ctx.fillStyle = paper
          ctx.fill()
          ctx.save()
          ctx.clip()
          if (node.image?.complete && node.image.naturalWidth) {
            ctx.globalAlpha = node.fade * (1 - eased)
            const scale = Math.max(w / node.image.naturalWidth, h / node.image.naturalHeight)
            ctx.drawImage(node.image, nx - (node.image.naturalWidth * scale) / 2, ny - (node.image.naturalHeight * scale) / 2, node.image.naturalWidth * scale, node.image.naturalHeight * scale)
          }
          ctx.globalAlpha = node.fade * eased
          ctx.fillStyle = colourOf(node)
          ctx.fill()
          ctx.restore()
          ctx.globalAlpha = node.fade * (1 - eased)
          ctx.strokeStyle = line
          ctx.lineWidth = 1 / k
          ctx.stroke()
          continue
        }
        ctx.beginPath()
        ctx.arc(nx, ny, node.r * grow + 1.5 / k, 0, Math.PI * 2)
        ctx.fillStyle = paper
        ctx.fill()
        ctx.beginPath()
        ctx.arc(nx, ny, node.r * grow, 0, Math.PI * 2)
        ctx.fillStyle = colourOf(node)
        ctx.fill()
        if (node.card.pinned_at) {
          ctx.strokeStyle = ink
          ctx.lineWidth = 1.2 / k
          ctx.stroke()
        }
      }

      // Labels fade in as you zoom; the hovered node and its neighbours always show theirs.
      const body = getComputedStyle(document.body).fontFamily
      const zoomed = clamp((k - 0.85) / 0.5, 0, 1)
      ctx.textAlign = "center"
      ctx.textBaseline = "top"
      for (const node of nodes.current) {
        const named = lit.current?.has(node.card.id) && lit.current.size < 40
        const alpha = Math.max(named ? 1 : 0, zoomed) * node.fade
        if (alpha < 0.05) continue
        ctx.globalAlpha = alpha
        ctx.fillStyle = node === active ? ink : muted
        ctx.font = `${node === active ? 500 : 400} ${13.5 / Math.max(k, 0.7)}px ${body}`
        const text = (node.card.title ?? node.card.note ?? node.card.domain ?? "").split("\n")[0]!
        ctx.fillText(text.length > 34 ? `${text.slice(0, 33)}…` : text, node.x ?? 0, (node.y ?? 0) + node.r + 4 / k)
      }
      ctx.globalAlpha = 1

      // The hover preview follows its node.
      if (peek.current && active) {
        peek.current.style.transform = `translate(${width / 2 + x + (active.x ?? 0) * k + 18}px, ${height / 2 + y + (active.y ?? 0) * k - 24}px)`
      }
    }
    frame = requestAnimationFrame(paint)
    const resize = () => void (dirty.current = true)
    addEventListener("resize", resize)
    return () => {
      cancelAnimationFrame(frame)
      removeEventListener("resize", resize)
    }
  }, [phone, matches, colourOf])

  const highlight = React.useCallback((node: Node | null) => {
    hover.current = node
    lit.current = node ? new Set([node.card.id, ...(near.current.get(node.card.id) ?? [])]) : null
    setPeeked(node?.card ?? null)
    dirty.current = true
  }, [])

  // Drag a node and the graph follows it; drag the paper to pan; the wheel zooms under the pointer.
  React.useEffect(() => {
    const el = canvas.current
    if (!el || phone) return
    let press: { x: number; y: number; moved: boolean; node: Node | null } | null = null
    const toMap = (event: MouseEvent) => {
      const box = el.getBoundingClientRect()
      const { x, y, k } = view.current
      return [(event.clientX - box.left - box.width / 2 - x) / k, (event.clientY - box.top - box.height / 2 - y) / k] as const
    }
    const at = (event: MouseEvent) => {
      const [mx, my] = toMap(event)
      let best: Node | null = null
      let reach = 10 / view.current.k
      for (const node of nodes.current) {
        const d = Math.hypot((node.x ?? 0) - mx, (node.y ?? 0) - my) - node.r
        if (d < reach) {
          reach = d
          best = node
        }
      }
      return best
    }
    const down = (event: PointerEvent) => {
      const node = at(event)
      press = { x: event.clientX, y: event.clientY, moved: false, node }
      el.setPointerCapture(event.pointerId)
      el.style.cursor = "grabbing"
      if (node) {
        node.fx = node.x
        node.fy = node.y
        simulation.current?.alphaTarget(0.25).restart()
      }
    }
    const move = (event: PointerEvent) => {
      if (press) {
        const dx = event.clientX - press.x
        const dy = event.clientY - press.y
        if (Math.abs(dx) + Math.abs(dy) > 3) press.moved = true
        if (press.node) {
          const [mx, my] = toMap(event)
          press.node.fx = mx
          press.node.fy = my
        } else {
          view.current.x += dx
          view.current.y += dy
          goal.current = { ...view.current }
          press.x = event.clientX
          press.y = event.clientY
        }
        dirty.current = true
        return
      }
      const next = at(event)
      if (next !== hover.current) {
        el.style.cursor = next ? "pointer" : "grab"
        highlight(next)
      }
    }
    const up = () => {
      const was = press
      press = null
      el.style.cursor = hover.current ? "pointer" : "grab"
      if (was?.node) {
        was.node.fx = null
        was.node.fy = null
        simulation.current?.alphaTarget(0)
      }
      if (was?.node && !was.moved) {
        feel("attentive", 1200)
        setOpen(was.node.card)
      }
    }
    const leave = () => {
      if (!press) highlight(null)
    }
    const wheel = (event: WheelEvent) => {
      event.preventDefault()
      const box = el.getBoundingClientRect()
      const px = event.clientX - box.left - box.width / 2
      const py = event.clientY - box.top - box.height / 2
      const v = goal.current
      const k = clamp(v.k * Math.exp(-event.deltaY * (event.ctrlKey ? 0.01 : 0.0022)), 0.2, 4)
      // Keep the point under the pointer still.
      goal.current = { k, x: px - ((px - v.x) * k) / v.k, y: py - ((py - v.y) * k) / v.k }
    }
    el.addEventListener("pointerdown", down)
    el.addEventListener("pointermove", move)
    el.addEventListener("pointerup", up)
    el.addEventListener("pointerleave", leave)
    el.addEventListener("wheel", wheel, { passive: false })
    return () => {
      el.removeEventListener("pointerdown", down)
      el.removeEventListener("pointermove", move)
      el.removeEventListener("pointerup", up)
      el.removeEventListener("pointerleave", leave)
      el.removeEventListener("wheel", wheel)
    }
  }, [phone, feel, highlight])

  const zoom = (factor: number) => {
    const v = goal.current
    goal.current = { k: clamp(v.k * factor, 0.2, 4), x: v.x * factor, y: v.y * factor }
  }

  // Asking the drop: until the agent answers, the question lights the cards that match it.
  React.useEffect(() => {
    if (!query.trim()) {
      setMatches(null)
      return
    }
    const id = setTimeout(async () => {
      const res = await fetch(`/api/cards?q=${encodeURIComponent(query)}`)
      if (!res.ok) return
      const { cards: found } = (await res.json()) as { cards: Card[] }
      setMatches(new Set(found.map((card) => card.id)))
      feel(found.length ? "surprised" : "confused", found.length ? 1200 : 2400)
    }, 220)
    return () => clearTimeout(id)
  }, [query, feel])

  async function askDrop(event: React.FormEvent) {
    event.preventDefault()
    const question = query.trim()
    if (!question || thinking) return
    setThinking(true)
    setKept(false)
    feel("curious", 4000)
    const res = await fetch("/api/ask", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ question }),
    })
    setThinking(false)
    const next = res.ok ? ((await res.json()) as Reply) : ({ kind: "none", text: "" } as Reply)
    setReply({ ...next, question })
    cited.current = next.kind === "answer" ? next.cards : []
    dirty.current = true
    setMatches(next.kind === "answer" && next.cards.length ? new Set(next.cards) : null)
    feel(next.kind === "answer" ? "happy" : next.kind === "grill" ? "attentive" : "confused", 2400)
  }

  async function answer(questionId: string, label: string) {
    await fetch("/api/ask/answer", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: questionId, answer: label }),
    })
    setReply((current) =>
      current?.kind === "grill"
        ? { ...current, questions: current.questions.filter((item) => item.id !== questionId) }
        : current,
    )
    feel("happy", 1400)
  }

  // A good answer is kept as a card of its own, tied to the cards it came from.
  async function keep() {
    if (reply?.kind !== "answer") return
    const res = await fetch("/api/cards", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: reply.question, note: reply.text }),
    })
    if (!res.ok) return
    const { card } = (await res.json()) as { card: Card }
    for (const id of reply.cards) {
      await fetch(`/api/cards/${card.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ link: id }),
      })
    }
    setKept(true)
    feel("proud", 1800)
    router.refresh()
  }

  const grouped = React.useMemo(() => {
    const byId = new Map(cards.map((card) => [card.id, card]))
    const inCluster = new Set(clusters.flatMap((cluster) => cluster.card_ids))
    return [
      ...clusters.map((cluster) => ({
        key: cluster.id,
        name: cluster.name,
        pinned: cluster.pinned,
        cards: cluster.card_ids.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : [])),
      })),
      { key: "loose", name: null, pinned: false, cards: cards.filter((card) => !inCluster.has(card.id)) },
    ].filter((group) => group.cards.length)
  }, [cards, clusters])

  const list = (
    <nav aria-label={t("pool", "listLabel")} className={phone ? "flex flex-col gap-10 px-6 pt-4 pb-40" : "sr-only"}>
      {grouped.map((group) => (
        <section key={group.key} aria-label={group.name ?? t("pool", "loose")}>
          <h2 className={`${group.pinned ? "text-primary" : "text-muted-foreground"} mb-3 text-[13px] tracking-[0.22em] lowercase`}>
            {group.name ?? t("pool", "loose")} · {group.cards.length}
          </h2>
          <ul className="flex snap-x gap-3 overflow-x-auto pb-2">
            {group.cards.map((card) => (
              <li key={card.id} className="shrink-0 snap-start">
                <button
                  onClick={() => setOpen(card)}
                  className="sheet block h-24 w-24 overflow-hidden text-left"
                  aria-label={card.title ?? card.note ?? card.domain ?? card.kind}
                >
                  {imageOf(card) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageOf(card)!} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="font-display line-clamp-4 block p-2 text-[13px] leading-snug">
                      {card.title ?? card.note}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </nav>
  )

  return (
    <div className="relative h-[100svh] overflow-hidden">
      {phone ? null : (
        <>
          <canvas ref={canvas} aria-hidden className="absolute inset-0 h-full w-full cursor-grab touch-none" />
          <div
            ref={peek}
            aria-hidden
            className={`sheet pointer-events-none absolute top-0 left-0 w-56 overflow-hidden transition-opacity duration-200 ${peeked ? "opacity-100" : "opacity-0"}`}
          >
            {peeked ? (
              <>
                {imageOf(peeked) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imageOf(peeked)!} alt="" className="aspect-[16/10] w-full object-cover" />
                ) : null}
                <div className="px-3 py-2.5">
                  <p className="font-display line-clamp-2 text-[15px] leading-snug">
                    {peeked.title ?? peeked.note?.split("\n")[0] ?? peeked.domain}
                  </p>
                  <p className="text-muted-foreground mt-1 truncate text-[12px] tracking-[0.18em] lowercase">
                    {peeked.domain ?? t("kinds", peeked.kind as never)}
                  </p>
                </div>
              </>
            ) : null}
          </div>
          <nav aria-label={t("pool", "groups")} className="absolute top-24 left-6 flex max-h-[50vh] w-48 flex-col gap-1 overflow-y-auto">
            {clusters.map((cluster, index) => (
              <button
                key={cluster.id}
                onMouseEnter={() => {
                  lit.current = new Set(cluster.card_ids)
                  dirty.current = true
                }}
                onMouseLeave={() => {
                  lit.current = null
                  dirty.current = true
                }}
                onFocus={() => {
                  lit.current = new Set(cluster.card_ids)
                  dirty.current = true
                }}
                onBlur={() => {
                  lit.current = null
                  dirty.current = true
                }}
                onClick={() => fit(new Set(cluster.card_ids))}
                className="group text-muted-foreground hover:text-foreground focus-visible:text-foreground flex items-center gap-2.5 py-1 text-left text-[14px] transition-colors"
              >
                <span
                  className="size-2 shrink-0 rounded-full bg-(--day) transition-transform group-hover:scale-150 dark:bg-(--night)"
                  style={
                    {
                      "--day": INK_TEXT.light[PALETTE[index % PALETTE.length]!],
                      "--night": INK_TEXT.dark[PALETTE[index % PALETTE.length]!],
                    } as React.CSSProperties
                  }
                />
                <span className="truncate">{cluster.name ?? t("pool", "loose")}</span>
                <span className="ml-auto tabular-nums opacity-60">{cluster.card_ids.length}</span>
              </button>
            ))}
          </nav>
          <TooltipProvider>
          <div className="absolute right-6 bottom-8 flex flex-col text-[17px]">
            {[
              { label: t("pool", "zoomIn"), glyph: "+", run: () => zoom(1.4) },
              { label: t("pool", "zoomOut"), glyph: "−", run: () => zoom(1 / 1.4) },
              { label: t("pool", "fit"), glyph: "⤢", run: () => fit() },
            ].map((control) => (
              <Tooltip key={control.glyph}>
                <TooltipTrigger
                  render={
                    <button
                      onClick={control.run}
                      aria-label={control.label}
                      className="text-muted-foreground hover:text-foreground hover:bg-card grid size-9 place-items-center transition-colors"
                    />
                  }
                >
                  {control.glyph}
                </TooltipTrigger>
                <TooltipContent side="left" className="text-[12px] tracking-[0.18em] lowercase">
                  {control.label}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
          </TooltipProvider>
        </>
      )}
      {list}
      {reply || thinking ? (
        <section
          aria-live="polite"
          className="sheet absolute bottom-32 left-1/2 w-[min(560px,calc(100%-2rem))] -translate-x-1/2 px-6 py-5"
        >
          {thinking ? (
            <p className="text-muted-foreground text-[15px]">{t("pool", "thinking")}</p>
          ) : reply?.kind === "answer" ? (
            <>
              <p className="font-display text-[17px] leading-[1.9]">{reply.text}</p>
              {reply.edges.length ? (
                <ul className="text-muted-foreground mt-3 flex flex-col gap-1 text-[13px]">
                  {reply.edges.map((edge, index) => (
                    <li key={index}>
                      ({edge.source}) — {edge.predicate} → ({edge.target})
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="mt-4 flex gap-6 text-[13px] tracking-[0.2em] lowercase">
                <span className="text-muted-foreground">
                  {t("pool", "cites")} · {reply.cards.length}
                </span>
                <button onClick={keep} disabled={kept} className="text-primary disabled:text-muted-foreground">
                  {t("pool", kept ? "kept" : "keep")}
                </button>
              </div>
            </>
          ) : reply?.kind === "grill" ? (
            <div className="flex flex-col gap-5">
              {reply.questions.map((item) => (
                <fieldset key={item.id} className="flex flex-col gap-2">
                  <legend className="font-display mb-2 text-[17px]">{item.question}</legend>
                  {item.options.map((option, index) => (
                    <button
                      key={option.label}
                      onClick={() => answer(item.id, option.label)}
                      className={`${index === 0 ? "border-primary text-foreground" : "border-border text-muted-foreground"} hover:border-primary border px-3 py-2 text-left text-[15px] transition-colors`}
                    >
                      {option.label}
                      {option.detail ? <span className="text-muted-foreground block text-[13px]">{option.detail}</span> : null}
                    </button>
                  ))}
                </fieldset>
              ))}
              {reply.questions.length === 0 ? <p className="text-[15px]">{t("pool", "learned")}</p> : null}
            </div>
          ) : reply?.kind === "task" ? (
            <p className="text-[15px]">{t("pool", reply.task === "organize" ? "organized" : "later")}</p>
          ) : (
            <p className="text-muted-foreground text-[15px]">{t("pool", "nothing")}</p>
          )}
        </section>
      ) : null}
      <form
        onSubmit={askDrop}
        className="bg-background/80 absolute inset-x-0 bottom-0 flex justify-center px-6 pt-4 pb-8 backdrop-blur sm:bg-transparent sm:backdrop-blur-none"
      >
        <label className="flex w-full max-w-md flex-col items-center gap-2">
          <span className="text-muted-foreground text-[13px] tracking-[0.22em] lowercase">{t("pool", "ask")}</span>
          <input
            data-ruled
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => feel("attentive", 1600)}
            placeholder={t("pool", "askHint")}
            className="border-primary font-display w-full border-b bg-transparent pb-2 text-center text-[21px] outline-none"
          />
        </label>
      </form>
      <CardDetail
        card={open}
        spaces={spaces}
        onClose={() => setOpen(null)}
        onChanged={(card) => {
          setCards((current) => current.map((item) => (item.id === card.id ? card : item)))
          setOpen(card)
        }}
        onDeleted={(id) => {
          setCards((current) => current.filter((item) => item.id !== id))
          setOpen(null)
          router.refresh()
        }}
      />
    </div>
  )
}
