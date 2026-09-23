"use client"

import { toast } from "@workspace/ui/components/toast"

/** A quiet note at the foot of the page; with `undo`, one press takes the action back. */
export function notify(title: string, undo?: { label: string; run: () => void | Promise<void> }) {
  toast.add({
    title,
    timeout: undo ? 6000 : 3000,
    actionProps: undo ? { children: undo.label, onClick: () => void undo.run() } : undefined,
  })
}
