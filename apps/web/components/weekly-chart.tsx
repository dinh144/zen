"use client"

import { Bar, BarChart, XAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@workspace/ui/components/chart"
import { useT } from "@/components/locale"

/** Cards saved per week, the last twelve: one quiet row of ink. */
export function WeeklyChart({ weeks }: { weeks: { week: string; n: number }[] }) {
  const t = useT()
  const config = { n: { label: t("panelUi", "weekly"), color: "var(--primary)" } } satisfies ChartConfig
  return (
    <figure className="px-6 sm:px-12">
      <figcaption className="text-muted-foreground mb-4 text-[12px] tracking-[0.25em] lowercase">{t("panelUi", "weekly")}</figcaption>
      <ChartContainer config={config} className="h-32 w-full max-w-xl">
        <BarChart data={weeks} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
          <XAxis dataKey="week" tickLine={false} axisLine={false} tickMargin={6} tickFormatter={(value: string) => value.slice(5)} fontSize={10} />
          <ChartTooltip cursor={false} content={<ChartTooltipContent hideIndicator />} />
          <Bar dataKey="n" fill="var(--color-n)" radius={0} />
        </BarChart>
      </ChartContainer>
    </figure>
  )
}
