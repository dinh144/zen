// A hand-off between pages so a card keeps its identity across a tab change: the board leaves its
// tiles' boxes here for the graph to grow nodes out of, and the graph leaves its nodes for the board.
export const morph = {
  /** A tab was pressed and the next page has not been born yet (React may wait seconds for images). */
  pending: false,
  at: 0,
  /** "ink": the page gathers into a drop and the next is born from it; "graph": tiles melt into nodes. */
  kind: "ink" as "ink" | "graph",
  tiles: new Map<string, DOMRect>(),
  nodes: new Map<string, { x: number; y: number; r: number }>(),
}

/** True while the page a tab press asked for is arriving: it shows at once and picks up the hand-off. */
export const fresh = () => morph.pending

