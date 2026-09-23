import { redirect } from "next/navigation"
import { currentUser } from "@/lib/user"
import { aiEnabled } from "@/lib/ai"
import { stats } from "@/lib/cards"
import { TopNav } from "@/components/top-nav"
import { ImportBox } from "@/components/import-box"
import { DropPicker } from "@/components/drop-picker"
import { SettingsCopy } from "@/components/settings-copy"
import { LanguagePicker } from "@/components/language-picker"
import { AiMood } from "@/components/ai-mood"
import { DeleteAccount } from "@/components/delete-account"
import { Pair } from "@/components/pair"
import { STRINGS } from "@/lib/i18n"
import { cloud } from "@/lib/supabase"

export const dynamic = "force-dynamic"

export default async function SettingsPage() {
  const me = await currentUser()
  if (!me) redirect("/login")
  const [counts, ai] = await Promise.all([stats(me), aiEnabled()])

  return (
    <div data-page className="min-h-screen px-6 pb-24 sm:px-12">
      <TopNav />
      <SettingsCopy kind="title" />
      <dl className="mb-14 grid max-w-md gap-3 text-[13px]">
        <div className="flex justify-between">
          <dt className="text-muted-foreground"><SettingsCopy kind="cards" /></dt>
          <dd>{counts.total}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground"><SettingsCopy kind="ai" /></dt>
          <dd className="flex items-center gap-2">
            <AiMood on={ai} />
            <span className={ai ? "text-primary" : ""}><SettingsCopy kind={ai ? "aiOn" : "aiOff"} /></span>
          </dd>
        </div>
      </dl>
      <section className="mb-12">
        <LanguagePicker />
      </section>

      <section className="mb-10">
        <h2 className="text-muted-foreground mb-6 text-[10px] tracking-[0.25em] lowercase"><SettingsCopy kind="yourDrop" /></h2>
        <DropPicker />
      </section>

      <div className="flex flex-col gap-4">
        <a href="/api/export" className="text-primary w-fit text-[10px] tracking-[0.22em] lowercase">
          <SettingsCopy kind="export" />
        </a>
        <ImportBox />
        {cloud ? (
          <form action="/auth/logout" method="post">
            <button className="text-muted-foreground hover:text-primary text-[10px] tracking-[0.22em] lowercase transition-colors">
              <Pair v={STRINGS.login.out} />
            </button>
          </form>
        ) : null}
        {cloud ? <DeleteAccount /> : null}
      </div>
    </div>
  )
}
