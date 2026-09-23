import Link from "next/link"
import { Droplet } from "@/components/droplet"
import { Pair } from "@/components/pair"
import { STRINGS } from "@/lib/i18n"

/** Also the face of a share link that was never shared or has been made private again. */
export default function NotFound({ message = STRINGS.errors.missing }: { message?: readonly [string, string] }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6">
      <Droplet expression="confused" className="text-primary h-16 w-12" motion="still" />
      <h1 className="font-display text-[17px] leading-relaxed">
        <Pair v={message} />
      </h1>
      <Link href="/" className="text-primary w-fit text-[10px] tracking-[0.25em] lowercase">
        <Pair v={STRINGS.errors.home} />
      </Link>
    </div>
  )
}
