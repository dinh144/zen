"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Droplet } from "@/components/droplet"
import { useDrop } from "@/components/drop-state"
import { useT } from "@/components/locale"
import { CLOUD } from "@/lib/cloud"
import { STAGING } from "@/lib/staging"


const FIELD =
  "border-border focus:border-primary font-display border-b bg-transparent pb-2 text-[17px] outline-none transition-colors"
const BUTTON = "text-primary w-fit text-[12px] tracking-[0.25em] lowercase"

export default function LoginPage() {
  const router = useRouter()
  const [value, setValue] = React.useState("")
  const [pw, setPw] = React.useState("")
  const [error, setError] = React.useState("")
  const [sent, setSent] = React.useState(false)
  const { ink, feel, rest, mood } = useDrop()
  const t = useT()

  React.useEffect(() => {
    rest("suspicious")
    const err = new URLSearchParams(location.search).get("error")
    if (err) setError(t("login", err === "allowlist" ? "notAllowed" : "failed"))
  }, [rest, t])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError("")
    // Staging only: a test mind with a password skips the magic link.
    const res =
      STAGING && pw
        ? await fetch("/auth/password", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ email: value, password: pw }),
          })
        : CLOUD
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
      return setError(t("login", STAGING && pw ? "wrong" : CLOUD ? "failed" : "wrong"))
    }
    feel("excited", 2000)
    if (STAGING && pw) router.push("/")
    else if (CLOUD) setSent(true)
    else router.push("/")
  }

  return (
    <form onSubmit={submit} className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6">
      <Droplet expression={mood} ink={ink} className="h-16 w-12" motion="fall" />
      <h1 className="font-display text-3xl tracking-[0.3em] lowercase">zen ai</h1>
      {sent ? (
        <p className="font-display text-[17px] leading-relaxed" role="status">
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
          {STAGING ? (
            <input
              data-ruled
              type="password"
              autoComplete="current-password"
              aria-label={t("login", "password")}
              value={pw}
              onChange={(event) => setPw(event.target.value)}
              placeholder={t("login", "stagingPassword")}
              className={FIELD}
            />
          ) : null}
          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}
          <button type="submit" className={BUTTON}>
            {t("login", STAGING && pw ? "enter" : CLOUD ? "sendLink" : "enter")}
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
