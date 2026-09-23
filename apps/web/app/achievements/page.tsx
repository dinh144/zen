import { redirect } from "next/navigation"
import { currentUser } from "@/lib/user"
import { unlocked } from "@/lib/cards"
import { TopNav } from "@/components/top-nav"
import { Reveal } from "@/components/reveal"
import { MarkDrop } from "@/components/mark-drop"
import { MarksHeading } from "@/components/marks-heading"
import { Pair } from "@/components/pair"
import { STRINGS } from "@/lib/i18n"

export const dynamic = "force-dynamic"

const ALL = [
  { key: "first-card", title: ["Thẻ đầu tiên", "First card"], hint: ["Lưu bất cứ thứ gì.", "Save anything at all."] },
  { key: "ten-cards", title: ["Mười thẻ", "Ten cards"], hint: ["Một trí nhớ bắt đầu thành hình.", "A mind starts to form."] },
  { key: "hundred-cards", title: ["Một trăm thẻ", "A hundred cards"], hint: ["Trôi bắt đầu thú vị.", "Drift gets interesting."] },
  { key: "first-space", title: ["Một không gian của riêng bạn", "A space of your own"], hint: ["Gom thẻ mà không cần thư mục.", "Group cards without folders."] },
  { key: "smart-space", title: ["Không gian tự đầy", "Smart space"], hint: ["Một không gian tự gom theo một câu tìm.", "A space that fills itself from a search."] },
  { key: "first-pin", title: ["Trong tầm tay", "At hand"], hint: ["Giữ gần thứ bạn đang nghĩ tới.", "Keep close what you are thinking about."] },
  { key: "first-link", title: ["Hai ý, một sợi chỉ", "Two ideas, one thread"], hint: ["Buộc một thẻ với thẻ khác.", "Tie one card to another."] },
  { key: "first-article", title: ["Đọc sau, mãi mãi", "Read it later, forever"], hint: ["Giữ một bài viết sống lâu hơn nguồn của nó.", "Keep an article that outlives its source."] },
] as const

export default async function AchievementsPage() {
  const me = await currentUser()
  if (!me) redirect("/login")
  const rows = await unlocked(me)
  const done = new Set(rows.map((row) => row.key))

  return (
    <div data-page className="min-h-screen pb-24">
      <TopNav />
      <MarksHeading />
      <ul className="mt-12 grid gap-8 px-6 sm:grid-cols-3 sm:px-12">
        {ALL.map((item, index) => (
          <Reveal key={item.key} index={index} as="li" className={`sheet relative px-6 py-7 ${done.has(item.key) ? "seal" : ""}`}>
            <div className="flex items-center gap-3">
              <MarkDrop earned={done.has(item.key)} />
              <p className={`font-display text-[15px] tracking-wide ${done.has(item.key) ? "" : "text-muted-foreground"}`}><Pair v={item.title} /></p>
            </div>
            <p className="text-muted-foreground mt-3 text-[12px] leading-relaxed"><Pair v={item.hint} /></p>
          </Reveal>
        ))}
      </ul>
    </div>
  )
}
