"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { sendMessageAction, type SendMessageState } from "../actions";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";

const MAX_FILES = 5;
const MAX_FILE_MB = 10;

function SendButton({ labels }: { labels: { idle: string; busy: string } }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-60"
    >
      {pending ? labels.busy : labels.idle}
    </button>
  );
}

export function ReplyForm({
  locale,
  recipientId,
  dict,
}: {
  locale: Locale;
  recipientId: string;
  dict: Dictionary["messages"];
}) {
  const [state, formAction] = useActionState<SendMessageState, FormData>(
    sendMessageAction,
    {},
  );
  const [files, setFiles] = useState<File[]>([]);
  const [clientError, setClientError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function onFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length > MAX_FILES) {
      setClientError(dict.tooManyFiles.replace("{n}", String(MAX_FILES)));
      e.target.value = "";
      return;
    }
    const tooBig = picked.find((f) => f.size > MAX_FILE_MB * 1024 * 1024);
    if (tooBig) {
      setClientError(
        dict.fileTooLarge.replace("{size}", String(MAX_FILE_MB)),
      );
      e.target.value = "";
      return;
    }
    setClientError(null);
    setFiles(picked);
  }

  function clearFiles() {
    setFiles([]);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <form
      ref={formRef}
      action={(fd) => {
        formAction(fd);
        // Reset on submit (the form re-renders after the redirect anyway)
        clearFiles();
      }}
      className="flex flex-col gap-2 border-t border-slate-200 bg-white p-4"
    >
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="recipient_id" value={recipientId} />

      {files.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
          {files.map((f) => (
            <span
              key={f.name + f.size}
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1"
            >
              <span className="max-w-[14rem] truncate">{f.name}</span>
              <span className="text-slate-400">
                ({(f.size / 1024).toFixed(0)} KB)
              </span>
            </span>
          ))}
          <button
            type="button"
            onClick={clearFiles}
            className="text-xs text-slate-500 hover:underline"
          >
            ✕
          </button>
        </div>
      )}

      <textarea
        name="body"
        required
        rows={2}
        placeholder={dict.bodyPlaceholder}
        onKeyDown={(e) => {
          // Enter sends; Shift+Enter inserts a newline (standard chat UX).
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            formRef.current?.requestSubmit();
          }
        }}
        className="block w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
      />

      <div className="flex items-center justify-between gap-2">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
          <span>📎 {dict.addFiles}</span>
          <input
            ref={fileRef}
            name="files"
            type="file"
            multiple
            onChange={onFilesChange}
            className="hidden"
          />
        </label>
        <SendButton labels={{ idle: dict.send, busy: dict.sending }} />
      </div>

      {(clientError || state.error) && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {clientError ?? dict.errorGeneric}
          {state.error && !clientError && (
            <span className="ml-1 text-red-600">({state.error})</span>
          )}
        </div>
      )}
    </form>
  );
}
