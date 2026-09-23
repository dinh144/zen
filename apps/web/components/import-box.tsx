"use client"

import * as React from "react"
import { useT } from "@/components/locale"

/** Takes a zen export, a JSON array of {url,title,note}, bookmark HTML, or Pocket/Raindrop CSV. */
export function ImportBox() {
  const t = useT()
  const [status, setStatus] = React.useState("")

  return (
    <label className="text-sm">
      <input
        type="file"
        accept="application/json,text/html,text/csv,.json,.html,.csv"
        hidden
        onChange={async (event) => {
          const file = event.target.files?.[0]
          if (!file) return
          setStatus(t("settings", "importing"))
          const res = await fetch("/api/import", {
            method: "POST",
            body: await file.text(),
          })
          const data = await res.json()
          setStatus(t("settings", "imported").replace("%n", String(data.imported)))
        }}
      />
      <span className="text-muted-foreground hover:text-primary cursor-pointer text-[10px] tracking-[0.22em] lowercase transition-colors">
        {t("settings", "import")}
      </span>
      {status ? <span className="text-muted-foreground ms-4 text-[11px]">{status}</span> : null}
    </label>
  )
}
