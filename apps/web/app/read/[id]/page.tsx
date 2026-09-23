
import { redirect } from "next/navigation"
import { currentUser } from "@/lib/user"
import { article } from "@/lib/cards"
import { sanitizeArticle } from "@/lib/sanitize"
import { ReadProgress } from "@/components/read-progress"
import { ReadBack, ReadMissing } from "@/components/read-copy"

export const dynamic = "force-dynamic"

// Reading Mode: the article as kept, with nothing else on the page.
export default async function ReadPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await currentUser()
  if (!me) redirect("/login")
  const { id } = await params
  const row = await article(me, id)
  if (!row?.article_html) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-sm">
        <ReadMissing />
        <ReadBack />
      </div>
    )
  }

  return (
    <div data-page className="mx-auto max-w-2xl px-6 py-16">
      <ReadProgress />
      <ReadBack />
      <h1 className="font-display mt-10 text-[32px] leading-[1.45] tracking-wide">{row.title}</h1>
      {row.url ? (
        <a href={row.url} target="_blank" rel="noreferrer" className="text-muted-foreground mt-2 block text-xs">
          {row.domain}
        </a>
      ) : null}
      <article
        className="prose-zen mt-12 text-[17px] leading-[1.9]"
        dangerouslySetInnerHTML={{ __html: sanitizeArticle(row.article_html) }}
      />
    </div>
  )
}
