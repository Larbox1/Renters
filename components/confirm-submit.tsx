"use client";

import { useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function ConfirmSubmit({
  message,
  className,
  children,
  confirmLabel,
  cancelLabel,
}: {
  message: string;
  className?: string;
  children: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  // The form this button lives in, captured on click so requestSubmit()
  // reaches the right server action after the dialog confirms.
  const formRef = useRef<HTMLFormElement | null>(null);

  // Call sites only pass `message`, so default labels follow the URL locale.
  const isFr = usePathname()?.split("/")[1] === "fr";

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={(e) => {
          formRef.current = e.currentTarget.form;
          setOpen(true);
        }}
      >
        {children}
      </button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isFr ? "Confirmer l'action" : "Confirm action"}
            </AlertDialogTitle>
            <AlertDialogDescription>{message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {cancelLabel ?? (isFr ? "Annuler" : "Cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => formRef.current?.requestSubmit()}
            >
              {confirmLabel ?? (isFr ? "Confirmer" : "Confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
