"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { ConfirmSubmit } from "@/components/confirm-submit";
import {
  deleteMessageAction,
  editMessageAction,
  type EditMessageState,
} from "../actions";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type { SignedAttachment } from "@/lib/messages/attachments";

export type BubbleMessage = {
  id: string;
  subject: string | null;
  body: string;
  attachments: SignedAttachment[];
  read_at: string | null;
  created_at: string;
};

function SaveButton({ label, busyLabel }: { label: string; busyLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-brand-700 shadow-sm hover:bg-brand-50 disabled:opacity-60"
    >
      {pending ? busyLabel : label}
    </button>
  );
}

export function MessageBubble({
  locale,
  message,
  isOutbound,
  isLastOutbound,
  createdAtLabel,
  readAtLabel,
  dict,
}: {
  locale: Locale;
  message: BubbleMessage;
  isOutbound: boolean;
  isLastOutbound: boolean;
  createdAtLabel: string;
  readAtLabel: string | null;
  dict: Dictionary["messages"];
}) {
  const [editing, setEditing] = useState(false);
  const [state, formAction] = useActionState<EditMessageState, FormData>(
    editMessageAction,
    {},
  );
  const canMutate = isOutbound && !message.read_at;
  const showReadIndicator = isOutbound && isLastOutbound;

  return (
    <div className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}>
      <div className="max-w-[80%] flex-col">
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
            isOutbound ? "bg-brand-600 text-white" : "bg-white text-slate-900"
          }`}
        >
          {message.subject && !editing && (
            <p
              className={`mb-1 text-xs font-semibold ${
                isOutbound ? "text-brand-100" : "text-slate-500"
              }`}
            >
              {message.subject}
            </p>
          )}

          {editing ? (
            <form
              action={(fd) => {
                formAction(fd);
                setEditing(false);
              }}
              className="space-y-2"
            >
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="message_id" value={message.id} />
              <textarea
                name="body"
                defaultValue={message.body}
                rows={3}
                required
                autoFocus
                className="block w-full resize-none rounded-md border-0 bg-white/10 px-2 py-1.5 text-sm text-white placeholder-brand-100 focus:bg-white/20 focus:outline-none focus:ring-1 focus:ring-white/40"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="rounded-md px-2.5 py-1 text-xs font-medium text-brand-100 hover:text-white"
                >
                  {dict.cancelEdit}
                </button>
                <SaveButton
                  label={dict.saveEdit}
                  busyLabel={dict.sending}
                />
              </div>
              {state.error && (
                <p className="text-xs text-red-200">{dict.errorGeneric}</p>
              )}
            </form>
          ) : (
            <p className="whitespace-pre-wrap leading-relaxed">
              {message.body}
            </p>
          )}

          {!editing && message.attachments.length > 0 && (
            <div className="mt-2 flex flex-col gap-2">
              {message.attachments.map((a) => {
                const isImage = a.mime_type.startsWith("image/");
                if (isImage && a.signedUrl) {
                  return (
                    <a
                      key={a.path}
                      href={a.signedUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block overflow-hidden rounded-lg"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={a.signedUrl}
                        alt={a.name}
                        className="max-h-64 w-auto rounded-lg"
                      />
                    </a>
                  );
                }
                return (
                  <a
                    key={a.path}
                    href={a.signedUrl ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    className={`inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium ${
                      isOutbound
                        ? "bg-brand-700 text-white hover:bg-brand-800"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    <span>📎</span>
                    <span className="max-w-[16rem] truncate">{a.name}</span>
                    <span
                      className={
                        isOutbound ? "text-brand-100" : "text-slate-500"
                      }
                    >
                      {(a.size / 1024).toFixed(0)} KB
                    </span>
                  </a>
                );
              })}
            </div>
          )}
        </div>

        <div
          className={`mt-1 flex items-center gap-2 px-1 text-[11px] text-slate-500 ${
            isOutbound ? "justify-end" : "justify-start"
          }`}
        >
          <time>{createdAtLabel}</time>
          {showReadIndicator && readAtLabel && (
            <span className="text-brand-600">
              ✓✓ {dict.readAt.replace("{time}", readAtLabel)}
            </span>
          )}
          {showReadIndicator && !readAtLabel && (
            <span className="text-slate-400">✓</span>
          )}
          {canMutate && !editing && (
            <>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-slate-500 hover:text-slate-800 hover:underline"
              >
                {dict.editAction}
              </button>
              <form action={deleteMessageAction} className="inline-flex">
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="message_id" value={message.id} />
                <ConfirmSubmit
                  message={dict.confirmDelete}
                  className="text-red-600 hover:text-red-700 hover:underline"
                >
                  {dict.deleteAction}
                </ConfirmSubmit>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
