"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog"
import { useT } from "@/components/locale"

/** The first press only asks; the account goes from inside the dialog. */
export function DeleteAccount() {
  const t = useT()
  return (
    <AlertDialog>
      <AlertDialogTrigger className="text-muted-foreground hover:text-destructive w-fit text-[12px] tracking-[0.22em] lowercase transition-colors">
        {t("settings", "delete")}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogTitle className="font-display text-lg tracking-wide">{t("panelUi", "deleteTitle")}</AlertDialogTitle>
        <AlertDialogDescription>{t("panelUi", "deleteBody")}</AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("settings", "deleteKeep")}</AlertDialogCancel>
          <form action="/auth/delete" method="post">
            <AlertDialogAction type="submit" variant="destructive" className="w-full">
              {t("settings", "deleteSure")}
            </AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
