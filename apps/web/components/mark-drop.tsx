"use client"

import { Droplet } from "@/components/droplet"
import { useDrop } from "@/components/drop-state"

/** Earned marks laugh; the rest are still asleep. */
export function MarkDrop({ earned }: { earned: boolean }) {
  const { ink } = useDrop()
  return (
    <Droplet
      expression={earned ? "laughing" : "sleepy"}
      ink={earned ? ink : "stone"}
      className={earned ? "h-6 w-[18px]" : "h-6 w-[18px] opacity-40"}
      motion={earned ? "idle" : "still"}
    />
  )
}
