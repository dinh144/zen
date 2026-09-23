"use client"

import * as React from "react"
import { useT } from "@/components/locale"

/** Two presses, no dialog: the first one only asks. */
export function DeleteAccount() {
  const t = useT()
  const [armed, setArmed] = React.useState(false)
  return (
    <form action="/auth/delete" method="post" className="flex items-center gap-4">
      {armed ? (
        <>
          {/* Its own key: reusing the arming button's node would turn that very click into a submit. */}
          <button key="sure" className="text-destructive text-[10px] tracking-[0.22em] lowercase">
            {t("settings", "deleteSure")}
          </button>
          <button key="keep" type="button" onClick={() => setArmed(false)} className="text-muted-foreground text-[10px] tracking-[0.22em] lowercase">
            {t("settings", "deleteKeep")}
          </button>
        </>
      ) : (
        <button
          key="arm"
          type="button"
          onClick={() => setArmed(true)}
          className="text-muted-foreground hover:text-destructive text-[10px] tracking-[0.22em] lowercase transition-colors"
        >
          {t("settings", "delete")}
        </button>
      )}
    </form>
  )
}
