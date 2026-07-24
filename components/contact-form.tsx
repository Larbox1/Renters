"use client";

import { useActionState } from "react";
import {
  sendContactMessage,
  type ContactFormState,
} from "@/app/[locale]/contact/actions";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";

const initialState: ContactFormState = {};

const inputClass =
  "w-full rounded-lg border border-line bg-paper-elev px-3.5 py-2.5 text-[14.5px] text-ink placeholder:text-ink-4 transition focus:border-accent focus:outline-none";

export function ContactForm({
  locale,
  dict,
}: {
  locale: Locale;
  dict: Dictionary["contact"]["form"];
}) {
  const [state, formAction, pending] = useActionState(
    sendContactMessage,
    initialState,
  );

  if (state.ok) {
    return (
      <div className="flex h-full min-h-[320px] flex-col items-start justify-center gap-3 rounded-2xl border border-line bg-paper-elev p-8">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent-deep">
          <svg className="h-5 w-5" viewBox="0 0 16 16" fill="none">
            <path
              d="M3 8.5 6.5 12 13 4.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <h2 className="text-lg font-semibold tracking-[-0.01em]">
          {dict.successTitle}
        </h2>
        <p className="max-w-[44ch] text-[14.5px] leading-[1.55] text-ink-2">
          {dict.successBody}
        </p>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-2xl border border-line bg-paper-elev p-8"
    >
      <input type="hidden" name="locale" value={locale} />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-[13px] font-medium text-ink-2">
          {dict.nameLabel}
          <input
            type="text"
            name="name"
            required
            maxLength={200}
            placeholder={dict.namePlaceholder}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] font-medium text-ink-2">
          {dict.emailLabel}
          <input
            type="email"
            name="email"
            required
            maxLength={320}
            placeholder={dict.emailPlaceholder}
            className={inputClass}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-[13px] font-medium text-ink-2">
        {dict.messageLabel}
        <textarea
          name="message"
          required
          maxLength={5000}
          rows={6}
          placeholder={dict.messagePlaceholder}
          className={`${inputClass} resize-y`}
        />
      </label>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3.5 py-2.5 text-[13.5px] text-red-800">
          {dict.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center gap-2 self-start rounded-lg bg-accent px-[18px] py-3 text-[15px] font-medium text-white shadow-sm transition hover:bg-accent-deep disabled:opacity-60"
      >
        {pending ? dict.submitting : dict.submit}
        <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none">
          <path
            d="M3 8h10m0 0L9 4m4 4-4 4"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </form>
  );
}
