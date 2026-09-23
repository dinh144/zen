"use client"

import * as React from "react"
import { Droplet } from "@/components/droplet"
import { useDrop } from "@/components/drop-state"

/** The drop is cross when the model is down, pleased when it is up. */
export function AiMood({ on }: { on: boolean }) {
  const { ink } = useDrop()
  return <Droplet expression={on ? "happy" : "angry"} ink={ink} className="h-5 w-[15px]" motion="still" />
}
