import { serve } from "inngest/next"
import { functions, inngest } from "@/lib/jobs"

// Inngest calls in here to run the functions; in the cloud every call is signed (INNGEST_SIGNING_KEY).
export const { GET, POST, PUT } = serve({ client: inngest, functions })
