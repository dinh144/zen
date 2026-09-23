// Fills the local mind with a believable English-speaking user for demos and screenshots.
//   bun --env-file=.env.local scripts/demo.ts
// Soft-deletes what is there (restore with UPDATE cards SET deleted_at = NULL), writes ~50 cards
// spread over three months, then queues them so the worker tags, reads and clusters them.
import { sql } from "../lib/db"
import { createCard, createSpace, linkByTitles, linkCards } from "../lib/cards"
import { wikiTitles } from "../lib/wiki"
import { setLocale } from "../lib/settings"
import { LOCAL_USER as me } from "../lib/user"
import { queueCards } from "../lib/jobs"
import type { Card } from "../lib/types"

type Item = Partial<Card> & { key?: string; daysAgo: number; pin?: boolean; space?: string; tie?: string }

const ITEMS: Item[] = [
  // Studying for AWS Solutions Architect
  { key: "saa-plan", daysAgo: 60, space: "AWS SAA-C03", pin: true, kind: "note", title: "SAA-C03 plan",
    note: "Exam on Nov 7.\n[x] Domain 1: secure architectures\n[x] Domain 2: resilient architectures\n[ ] Domain 3: high-performing architectures\n[ ] Domain 4: cost-optimized architectures\n[ ] Two full practice exams above 80%" },
  { daysAgo: 58, space: "AWS SAA-C03", url: "https://aws.amazon.com/certification/certified-solutions-architect-associate/" },
  { daysAgo: 55, space: "AWS SAA-C03", url: "https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html" },
  { key: "sqs", daysAgo: 41, space: "AWS SAA-C03", tie: "saa-plan", kind: "note", title: "SQS vs SNS vs EventBridge",
    note: "SQS: a queue, one consumer pulls, decouples producers from slow workers.\nSNS: push fan-out to many subscribers.\nEventBridge: routes events by rules, has schemas and third-party sources.\nExam trick: 'decouple' almost always means SQS." },
  { daysAgo: 39, space: "AWS SAA-C03", tie: "sqs", url: "https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/welcome.html" },
  { daysAgo: 30, space: "AWS SAA-C03", kind: "note", title: "Wrong answers, practice test 3",
    note: "S3 Transfer Acceleration, not CloudFront, for fast uploads from far away.\nAurora Global Database for cross-region reads under a second.\nGateway endpoints exist only for S3 and DynamoDB." },
  { daysAgo: 12, space: "AWS SAA-C03", url: "https://www.youtube.com/watch?v=c3Cn4xYfxJY" },

  // Cooking
  { key: "pho", daysAgo: 88, space: "Kitchen", kind: "recipe", title: "Mom's beef pho broth",
    note: "Char 2 onions and a thumb of ginger.\nBlanch 1.5 kg beef bones, rinse.\nSimmer 6 hours with star anise, cinnamon, cloves, cardamom.\nSeason at the end: fish sauce, rock sugar, salt.\nSkim every 30 minutes or the broth goes cloudy." },
  { daysAgo: 70, space: "Kitchen", tie: "pho", url: "https://www.seriouseats.com/pho-ga-vietnamese-chicken-noodle-soup-recipe" },
  { daysAgo: 52, space: "Kitchen", url: "https://www.bonappetit.com/recipe/bas-best-chocolate-chip-cookies" },
  { daysAgo: 33, space: "Kitchen", kind: "note", title: "Groceries",
    note: "[ ] fish sauce (Red Boat)\n[x] rice noodles\n[ ] limes\n[ ] Thai basil\n[x] eggs\n[ ] oat milk" },
  { daysAgo: 18, space: "Kitchen", url: "https://cooking.nytimes.com/recipes/1017518-panzanella" },
  { daysAgo: 6, space: "Kitchen", kind: "note", title: "Cold brew ratio", note: "1:8 coffee to water, coarse grind, 16 hours in the fridge. Dilute 1:1 with milk." },

  // Da Nang and a trip to Japan
  { key: "japan", daysAgo: 47, space: "Japan, April", pin: true, kind: "note", title: "Japan itinerary draft",
    note: "Apr 3 to 12.\nTokyo 4 nights: Shimokitazawa, teamLab, day trip to Kamakura.\nKyoto 3 nights: Fushimi Inari at 7am, Philosopher's Path.\nOsaka 2 nights: eat.\n[ ] book JR pass\n[ ] ryokan in Kyoto" },
  { daysAgo: 46, space: "Japan, April", tie: "japan", url: "https://www.japan-guide.com/e/e3900.html" },
  { daysAgo: 44, space: "Japan, April", url: "https://www.teamlab.art/e/borderless-azabudai/" },
  { daysAgo: 25, space: "Japan, April", kind: "note", title: "Flight VN 300, SGN to NRT",
    note: "Departs Apr 3, 2027 at 00:05. Seat 32A. Booking ref K7QX2M." },
  { daysAgo: 80, kind: "note", title: "Cafés worth the ride",
    note: "Nhà Của Mây, top floor, quiet before 9.\nThe Local Beans, good for laptop days.\nMộc Cafe by the river, sunset." },
  { daysAgo: 64, url: "https://en.wikipedia.org/wiki/Marble_Mountains_(Vietnam)" },

  // Work: frontend
  { daysAgo: 85, url: "https://react.dev/learn/you-might-not-need-an-effect" },
  { daysAgo: 77, url: "https://overreacted.io/a-complete-guide-to-useeffect/" },
  { daysAgo: 62, url: "https://www.joshwcomeau.com/css/interactive-guide-to-flexbox/" },
  { daysAgo: 49, url: "https://web.dev/articles/inp" },
  { daysAgo: 36, url: "https://nextjs.org/docs/app/getting-started/caching-and-revalidating" },
  { daysAgo: 27, url: "https://github.com/vercel/ai" },
  { daysAgo: 20, url: "https://www.anthropic.com/engineering/building-effective-agents" },
  { daysAgo: 9, url: "https://martinfowler.com/articles/patterns-of-distributed-systems/" },
  { daysAgo: 23, kind: "note", title: "1:1 with Linh",
    note: "Wants more ownership on the checkout rewrite.\nAgreed: she leads the payment form, I review.\n[ ] share the INP dashboard with her\n[ ] ask design for empty states" },

  // Design references
  { daysAgo: 73, url: "https://linear.app/method" },
  { daysAgo: 57, url: "https://www.are.na/about" },
  { daysAgo: 42, url: "https://rauno.me/craft/interaction-design" },
  { daysAgo: 15, url: "https://www.refactoringui.com/" },

  // Reading and listening
  { key: "books", daysAgo: 90, kind: "note", title: "Books for this year",
    note: "[x] The Remains of the Day, Kazuo Ishiguro\n[x] Designing Data-Intensive Applications\n[ ] Klara and the Sun\n[ ] The Creative Act, Rick Rubin\n[ ] Four Thousand Weeks" },
  { daysAgo: 68, tie: "books", url: "https://www.goodreads.com/book/show/28815.The_Remains_of_the_Day" },
  { daysAgo: 38, tie: "books", url: "https://dataintensive.net/" },
  { daysAgo: 31, url: "https://www.youtube.com/watch?v=arj7oStGLkU" },
  { daysAgo: 11, url: "https://open.spotify.com/album/1ATL5GLyefJaxhQzSPVrLX" },

  // Quotes
  { daysAgo: 86, kind: "quote", content: "What we want is to see the child in pursuit of knowledge, and not knowledge in pursuit of the child.", meta: { quote: "What we want is to see the child in pursuit of knowledge, and not knowledge in pursuit of the child.", author: "George Bernard Shaw" } },
  { daysAgo: 59, kind: "quote", content: "The days are long but the decades are short.", meta: { quote: "The days are long but the decades are short.", author: "Gretchen Rubin" } },
  { daysAgo: 34, kind: "quote", content: "You do not rise to the level of your goals. You fall to the level of your systems.", meta: { quote: "You do not rise to the level of your goals. You fall to the level of your systems.", author: "James Clear" } },
  { daysAgo: 8, kind: "quote", content: "Make it work, make it right, make it fast.", meta: { quote: "Make it work, make it right, make it fast.", author: "Kent Beck" } },

  // Long-form notes: Markdown with a table, code, and [[links]] to other cards
  { daysAgo: 16, space: "AWS SAA-C03", kind: "note", title: "Storage cheat sheet",
    note: "## Which storage when\n\n| Need | Pick | Why |\n| --- | --- | --- |\n| Shared files, many EC2 | EFS | NFS, grows by itself |\n| One instance, low latency | EBS gp3 | block, set IOPS apart from size |\n| Objects, any scale | S3 | 11 nines, lifecycle rules |\n| Archive, rare reads | S3 Glacier Deep Archive | cheapest, hours to restore |\n\nSee [[SQS vs SNS vs EventBridge]] for the messaging half, and the plan in [[SAA-C03 plan]].\n\n```bash\naws s3 cp ./notes s3://my-bucket/notes --recursive --storage-class STANDARD_IA\n```" },
  { daysAgo: 3, kind: "note", title: "Useful git",
    note: "Undo the last commit but keep the changes:\n\n```bash\ngit reset --soft HEAD~1\n```\n\nFind which commit broke it:\n\n```bash\ngit bisect start && git bisect bad && git bisect good v1.4.0\n```\n\n> Commit small, commit often.\n\nRelated: [[Side project ideas]]" },
  // Health and life admin
  { daysAgo: 66, kind: "note", title: "Running", note: "Week 6 of the 10k plan.\nTue 5k easy, Thu 6x400m, Sun 8k long.\nShin feels fine with the new shoes." },
  { daysAgo: 50, url: "https://www.strava.com/" },
  { daysAgo: 29, kind: "note", title: "Gift ideas",
    note: "Mom: a good cast iron pan.\nAn: film camera roll, Kodak Portra 400.\nDad: the Ishiguro book." },
  { daysAgo: 21, kind: "note", title: "Dentist", note: "Cleaning on Oct 14 at 9:30, Dr. Tran, 2nd floor." },
  { daysAgo: 4, kind: "note", title: "Side project ideas",
    note: "A tiny app that turns receipts into a monthly spend chart.\nA bot that reminds me to call my grandparents on Sundays.\nOpen source the cold brew calculator, lol." },
  { daysAgo: 2, url: "https://www.youtube.com/watch?v=aircAruvnKk" },
  { daysAgo: 1, kind: "note", title: "Thought", note: "Save less, revisit more. Most of what I keep I never open twice." },
  { daysAgo: 0, url: "https://www.theverge.com/" },
]

await sql`UPDATE cards SET deleted_at = now() WHERE user_id = ${me} AND deleted_at IS NULL`
await sql`DELETE FROM spaces WHERE user_id = ${me}`
await setLocale(me, "en")

// Spaces nest like folders: these parents hold the spaces named under them.
const PARENTS: Record<string, string> = { "AWS SAA-C03": "Study", "Japan, April": "Travel" }
const spaces = new Map<string, string>()
for (const parent of new Set(Object.values(PARENTS))) spaces.set(parent, (await createSpace(me, parent)).id)
const ids = new Map<string, string>()
const all: string[] = []
for (const { key, daysAgo, pin, space, tie, ...input } of ITEMS) {
  const card = await createCard(me, input)
  const at = new Date(Date.now() - daysAgo * 86_400_000 - Math.random() * 36_000_000)
  await sql`UPDATE cards SET created_at = ${at}, updated_at = ${at}, pinned_at = ${pin ? at : null} WHERE id = ${card.id}`
  if (space) {
    if (!spaces.has(space)) spaces.set(space, (await createSpace(me, space, null, spaces.get(PARENTS[space] ?? "") ?? null)).id)
    await sql`INSERT INTO card_spaces (card_id, space_id) VALUES (${card.id}, ${spaces.get(space)!}) ON CONFLICT DO NOTHING`
  }
  if (tie) await linkCards(me, card.id, ids.get(tie)!)
  await linkByTitles(me, card.id, wikiTitles(card.note))
  if (key) ids.set(key, card.id)
  all.push(card.id)
}
await queueCards(all, me)
console.log(`${all.length} cards, ${spaces.size} spaces, queued`)
await sql.end()
