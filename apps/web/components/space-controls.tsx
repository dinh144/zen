"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog"
import { useT } from "@/components/locale"
import type { Space } from "@/lib/types"

export function SpaceControls({ space, parent }: { space?: Space; parent?: string }) {
  const router = useRouter()
  const t = useT()
  const [name, setName] = React.useState("")
  const [query, setQuery] = React.useState("")

  if (!space) {
    return (
      <form
        onSubmit={async (event) => {
          event.preventDefault()
          if (!name.trim()) return
          await fetch("/api/spaces", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ name, query, parent }),
          })
          setName("")
          setQuery("")
          router.refresh()
        }}
        className="flex max-w-2xl flex-wrap items-end gap-8"
      >
        <label className="flex flex-col gap-2">
          <span className="text-muted-foreground text-[12px] tracking-[0.25em] lowercase">{t("spaces", "name")}</span>
          <input
            data-ruled
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t("spaces", "aName")}
            className="border-border font-display focus:border-primary w-44 border-b bg-transparent pb-2 text-[17px] outline-none transition-colors"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-muted-foreground text-[12px] tracking-[0.25em] lowercase">{t("spaces", "gathers")}</span>
          <input
            data-ruled
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("spaces", "gathersHint")}
            className="border-border font-display focus:border-primary w-full max-w-md border-b sm:w-96 bg-transparent pb-2 text-[17px] outline-none transition-colors"
          />
        </label>
        <button type="submit" className="text-primary pb-2 text-[12px] tracking-[0.25em] lowercase">
          {t("spaces", "open")}
        </button>
      </form>
    )
  }

  const share = async (shared: boolean) => {
    await fetch(`/api/spaces/${space.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ shared }),
    })
    router.refresh()
  }

  return (
    <div className="mt-5 flex items-center gap-6">
      {space.share_token ? (
        <>
          <button
            onClick={() => navigator.clipboard.writeText(`${location.origin}/s/${space.share_token}`)}
            className="text-primary text-[12px] tracking-[0.22em] lowercase"
          >
            {t("spaces", "copy")}
          </button>
          <button
            onClick={() => share(false)}
            className="text-muted-foreground hover:text-foreground text-[12px] tracking-[0.22em] lowercase transition-colors"
          >
            {t("spaces", "private")}
          </button>
        </>
      ) : (
        <button
          onClick={() => share(true)}
          className="text-muted-foreground hover:text-primary text-[12px] tracking-[0.22em] lowercase transition-colors"
        >
          {t("spaces", "share")}
        </button>
      )}
      <AlertDialog>
        <AlertDialogTrigger className="text-muted-foreground hover:text-destructive ms-auto text-[12px] tracking-[0.22em] lowercase transition-colors">
          {t("spaces", "letGo")}
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogTitle className="font-display text-lg tracking-wide">{t("panelUi", "spaceTitle")}</AlertDialogTitle>
          <AlertDialogDescription>{t("panelUi", "spaceBody")}</AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common", "cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={async () => {
                await fetch(`/api/spaces/${space.id}`, { method: "DELETE" })
                router.refresh()
              }}
            >
              {t("common", "confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
