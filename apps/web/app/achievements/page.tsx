import { redirect } from "next/navigation"
import { currentUser } from "@/lib/user"
import { unlocked } from "@/lib/cards"
import { sql } from "@/lib/db"
import { WeeklyChart } from "@/components/weekly-chart"
import { TopNav } from "@/components/top-nav"
import { Reveal } from "@/components/reveal"
import { MarkDrop } from "@/components/mark-drop"
import { MarksHeading } from "@/components/marks-heading"
import { Pair } from "@/components/pair"
import { STRINGS } from "@/lib/i18n"

export const dynamic = "force-dynamic"

const ALL = [
  {
    key: "first-card",
    title: ["Thẻ đầu tiên", "First card", "첫 카드", "第一张卡片", "はじめてのカード"],
    hint: ["Lưu bất cứ thứ gì.", "Save anything at all.", "무엇이든 저장해보세요.", "保存任何东西。", "何でも保存してみてください。"],
  },
  {
    key: "ten-cards",
    title: ["Mười thẻ", "Ten cards", "열 장의 카드", "十张卡片", "十枚のカード"],
    hint: ["Một trí nhớ bắt đầu thành hình.", "A mind starts to form.", "기억이 모양을 갖추기 시작해요.", "记忆开始成形。", "記憶が形になり始めます。"],
  },
  {
    key: "hundred-cards",
    title: ["Một trăm thẻ", "A hundred cards", "백 장의 카드", "一百张卡片", "百枚のカード"],
    hint: ["Trôi bắt đầu thú vị.", "Drift gets interesting.", "표류가 흥미로워지기 시작해요.", "漂流开始变得有趣。", "漂流が面白くなってきます。"],
  },
  {
    key: "first-space",
    title: ["Một không gian của riêng bạn", "A space of your own", "나만의 공간", "属于你自己的空间", "あなただけの空間"],
    hint: ["Gom thẻ mà không cần thư mục.", "Group cards without folders.", "폴더 없이 카드를 모아보세요.", "不用文件夹也能归类卡片。", "フォルダなしでカードを集めてみてください。"],
  },
  {
    key: "smart-space",
    title: ["Không gian tự đầy", "Smart space", "스스로 채워지는 공간", "自己填满的空间", "自ら満ちていく空間"],
    hint: [
      "Một không gian tự gom theo một câu tìm.",
      "A space that fills itself from a search.",
      "검색어 하나로 스스로 채워지는 공간이에요.",
      "一个从搜索词中自己聚成的空间。",
      "検索語ひとつから自ら集まる空間です。",
    ],
  },
  {
    key: "first-pin",
    title: ["Trong tầm tay", "At hand", "손닿는 곳에", "触手可及", "手の届くところに"],
    hint: [
      "Giữ gần thứ bạn đang nghĩ tới.",
      "Keep close what you are thinking about.",
      "지금 생각하는 것을 가까이 두세요.",
      "把正在想的东西留在身边。",
      "今考えていることを近くに置いてください。",
    ],
  },
  {
    key: "first-link",
    title: ["Hai ý, một sợi chỉ", "Two ideas, one thread", "두 생각, 하나의 실", "两个想法，一根线", "ふたつの思い、ひとつの糸"],
    hint: ["Buộc một thẻ với thẻ khác.", "Tie one card to another.", "카드 하나를 다른 카드와 묶어보세요.", "把一张卡片系在另一张上。", "カードをもう一枚のカードに結んでみてください。"],
  },
  {
    key: "first-article",
    title: ["Đọc sau, mãi mãi", "Read it later, forever", "나중에, 영원히 읽기", "以后读，永远读", "あとで、ずっと読む"],
    hint: [
      "Giữ một bài viết sống lâu hơn nguồn của nó.",
      "Keep an article that outlives its source.",
      "출처보다 오래 남는 글을 저장하세요.",
      "保存一篇比它的来源活得更久的文章。",
      "元のサイトより長く残る記事を保存してください。",
    ],
  },
] as const

export default async function AchievementsPage() {
  const me = await currentUser()
  if (!me) redirect("/login")
  const [rows, weeks] = await Promise.all([
    unlocked(me),
    sql<{ week: string; n: number }[]>`
      SELECT to_char(w, 'YYYY-MM-DD') AS week, count(c.id)::int AS n
      FROM generate_series(date_trunc('week', now()) - interval '11 weeks', date_trunc('week', now()), interval '1 week') AS w
      LEFT JOIN cards c ON c.user_id = ${me} AND c.deleted_at IS NULL AND date_trunc('week', c.created_at) = w
      GROUP BY w ORDER BY w`,
  ])
  const done = new Set(rows.map((row) => row.key))

  return (
    <div data-page className="min-h-screen pb-24">
      <TopNav />
      <MarksHeading />
      <WeeklyChart weeks={[...weeks]} />
      <ul className="mt-12 grid gap-8 px-6 sm:grid-cols-3 sm:px-12">
        {ALL.map((item, index) => (
          <Reveal key={item.key} index={index} as="li" className={`sheet relative px-6 py-7 ${done.has(item.key) ? "seal" : ""}`}>
            <div className="flex items-center gap-3">
              <MarkDrop earned={done.has(item.key)} />
              <p className={`font-display text-[17px] tracking-wide ${done.has(item.key) ? "" : "text-muted-foreground"}`}><Pair v={item.title} /></p>
            </div>
            <p className="text-muted-foreground mt-3 text-[14px] leading-relaxed"><Pair v={item.hint} /></p>
          </Reveal>
        ))}
      </ul>
    </div>
  )
}
