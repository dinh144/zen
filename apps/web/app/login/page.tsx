"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Droplet } from "@/components/droplet"
import { useDrop } from "@/components/drop-state"
import { useT } from "@/components/locale"
import { CLOUD } from "@/lib/cloud"


const FIELD =
  "border-border focus:border-primary font-display border-b bg-transparent pb-2 text-[15px] outline-none transition-colors"
const BUTTON = "text-primary w-fit text-[10px] tracking-[0.25em] lowercase"

export default function LoginPage() {
  const router = useRouter()
  const [value, setValue] = React.useState("")
  const [error, setError] = React.useState("")
  const [sent, setSent] = React.useState(false)
  const { ink, feel, rest, mood } = useDrop()
  const t = useT()

  React.useEffect(() => {
    rest("suspicious")
    if (new URLSearchParams(location.search).get("error")) setError(t("login", "failed"))
  }, [rest, t])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError("")
    const res = CLOUD
      ? await fetch("/auth/email", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: value }),
        })
      : await fetch("/api/login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ password: value }),
        })
    if (!res.ok) {
      feel("sad", 3000)
      return setError(t("login", CLOUD ? "failed" : "wrong"))
    }
    feel("excited", 2000)
    if (CLOUD) setSent(true)
    else router.push("/")
  }

  return (
    <form onSubmit={submit} className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6">
      <Droplet expression={mood} ink={ink} className="h-16 w-12" motion="fall" />
      <h1 className="font-display text-3xl tracking-[0.3em] lowercase">zen</h1>
      {sent ? (
        <p className="font-display text-[15px] leading-relaxed" role="status">
          {t("login", "sent")}
        </p>
      ) : (
        <>
          <input
            data-ruled
            type={CLOUD ? "email" : "password"}
            autoComplete={CLOUD ? "email" : "current-password"}
            aria-label={t("login", CLOUD ? "email" : "password")}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={t("login", CLOUD ? "email" : "password")}
            autoFocus
            required
            className={FIELD}
          />
          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}
          <button type="submit" className={BUTTON}>
            {t("login", CLOUD ? "sendLink" : "enter")}
          </button>
          {CLOUD ? (
            <a href="/auth/google" className={`${BUTTON} text-muted-foreground hover:text-primary transition-colors`}>
              {t("login", "google")}
            </a>
          ) : null}
        </>
      )}
    </form>
  )
}
