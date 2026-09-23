// MCP clients read this to find where to sign in: Supabase Auth's OAuth 2.1 server, in the cloud.
export function GET(request: Request) {
  const origin = new URL(request.url).origin
  const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL
  return Response.json({
    resource: `${origin}/api/mcp`,
    authorization_servers: supabase ? [`${supabase}/auth/v1`] : [],
    bearer_methods_supported: ["header"],
  })
}
