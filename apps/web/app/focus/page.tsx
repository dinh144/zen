import { redirect } from "next/navigation"
import { currentUser } from "@/lib/user"
import { FocusEditor } from "@/components/focus-editor"

export default async function FocusPage() {
  if (!(await currentUser())) redirect("/login")
  return <FocusEditor />
}
