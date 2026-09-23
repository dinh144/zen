import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { COOKIE, validSession } from "@/lib/auth"
import { cors } from "@/lib/http"

// Cloud: keep the Supabase session fresh on every request; routes and pages check the user.
// Local: pages check the password themselves, and this gates the API.
export async function proxy(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    let response = NextResponse.next({ request })
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (list) => {
            for (const { name, value } of list) request.cookies.set(name, value)
            response = NextResponse.next({ request })
            for (const { name, value, options } of list) response.cookies.set(name, value, options)
          },
        },
      },
    )
    await supabase.auth.getClaims()
    response.headers.set("cache-control", "private, no-store")
    return response
  }
  if (!request.nextUrl.pathname.startsWith("/api/")) return
  if (request.nextUrl.pathname.match(/^\/api\/(login|file)/)) return
  if (request.method === "OPTIONS" || validSession(request.cookies.get(COOKIE)?.value)) return
  return NextResponse.json({ error: "locked" }, { status: 401, headers: cors })
}

export const config = {
  // Everything but static assets and uploaded files.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|api/file).*)"],
}
