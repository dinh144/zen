import { redirect } from "next/navigation"
import { currentUser } from "@/lib/user"
import { aiEnabled } from "@/lib/ai"
import { stats } from "@/lib/cards"
import { TopNav } from "@/components/top-nav"
import { SettingsCopy } from "@/components/settings-copy"
import { AiMood } from "@/components/ai-mood"
import { SettingsPanel } from "@/components/settings-panel"

export const dynamic = "force-dynamic"

export default async function SettingsPage() {
  const me = await currentUser()
  if (!me) redirect("/login")
  const [counts, ai] = await Promise.all([stats(me), aiEnabled()])

  return (
    <div data-page className="min-h-screen px-6 pb-24 sm:px-12">
      <TopNav />
      <SettingsCopy kind="title" />
      <dl className="mb-14 grid max-w-md gap-3 text-[15px]">
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
      <SettingsPanel />
    </div>
  )
}
