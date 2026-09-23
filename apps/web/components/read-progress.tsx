"use client"

import * as React from "react"

/** A column of ink down the left margin, filling as you read. */
export function ReadProgress() {
  const [progress, setProgress] = React.useState(0)

  React.useEffect(() => {
    const onScroll = () => {
      const height = document.documentElement.scrollHeight - window.innerHeight
      setProgress(height > 0 ? window.scrollY / height : 0)
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return <span className="read-progress" style={{ transform: `scaleY(${progress})` }} aria-hidden />
}
