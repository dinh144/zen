// To-dos live inside a note as "[ ] task" / "[x] done" lines (a leading "-" or "*" is fine),
// so they stay plain text: searchable, exportable, and readable anywhere.
const LINE = /^(\s*(?:[-*]\s*)?)\[( |x|X)\]\s+(.*)$/

export type Todo = { index: number; done: boolean; text: string }

export const todosOf = (note: string | null): Todo[] =>
  (note ?? "").split("\n").flatMap((line, index) => {
    const match = LINE.exec(line)
    return match ? [{ index, done: match[2] !== " ", text: match[3]! }] : []
  })

/** The same note with one to-do flipped. */
export function toggleTodo(note: string, index: number) {
  const lines = note.split("\n")
  const match = LINE.exec(lines[index] ?? "")
  if (!match) return note
  lines[index] = `${match[1]}[${match[2] === " " ? "x" : " "}] ${match[3]}`
  return lines.join("\n")
}
