import type { Dictionary } from "@/i18n/dictionaries/en";

const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.meskasas.mobile&pcampaignid=web_share";

// Custom-drawn badges instead of the official store artwork: the App Store one
// must render disabled with an "available soon" note, which brand guidelines
// don't allow on the official images.

function PlayLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0" aria-hidden>
      <path
        fill="#00d7fe"
        d="M4.1 1.9c-.4.4-.6 1-.6 1.7v16.8c0 .7.2 1.3.6 1.7l.1.1 9.4-9.4v-.2L4.2 1.8l-.1.1Z"
      />
      <path
        fill="#00ee76"
        d="M16.8 8.9 5.8 2.5c-.7-.4-1.3-.4-1.7 0l9.5 9.4 3.2-3Z"
      />
      <path
        fill="#ffd500"
        d="m16.7 15.2-3.1-3.2v-.2l3.1-3.1h.1l3.7 2.2c1.1.6 1.1 1.6 0 2.2l-3.7 2.1h-.1Z"
      />
      <path
        fill="#f43249"
        d="m16.8 15.1-3.2-3.1-9.5 9.5c.4.4 1 .4 1.7 0l11-6.4Z"
      />
    </svg>
  );
}

function AppleLogo() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6 shrink-0"
      fill="currentColor"
      aria-hidden
    >
      <path d="M16.365 1.43c0 1.14-.417 2.2-1.253 3.083-.897.973-2.093 1.536-3.12 1.454-.05-1.09.457-2.213 1.263-3.06.87-.94 2.19-1.55 3.11-1.477zM20.94 17.06c-.53 1.23-.786 1.78-1.47 2.87-.955 1.52-2.3 3.41-3.966 3.42-1.48.02-1.86-.96-3.87-.95-2.01.01-2.43.98-3.91.96-1.665-.02-2.94-1.73-3.895-3.25C1.16 15.89.885 11.32 2.61 8.9c1.22-1.72 3.15-2.73 4.96-2.73 1.845 0 3.005 1.01 4.53 1.01 1.48 0 2.38-1.01 4.51-1.01 1.615 0 3.325.88 4.545 2.4-3.995 2.19-3.35 7.89-.215 8.49z" />
    </svg>
  );
}

const badgeClass =
  "inline-flex items-center gap-2.5 rounded-lg bg-ink px-3.5 py-2 text-white";

export function StoreBadges({
  dict,
}: {
  dict: Dictionary["footer"]["storeBadges"];
}) {
  return (
    <div className="mt-5 flex flex-wrap gap-2.5">
      <a
        href={PLAY_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={`${badgeClass} transition hover:opacity-85`}
      >
        <PlayLogo />
        <span className="leading-tight">
          <span className="block text-[10px] uppercase tracking-[0.06em] opacity-80">
            {dict.googlePlayTop}
          </span>
          <span className="-mt-0.5 block text-[15px] font-semibold">
            {dict.googlePlayName}
          </span>
        </span>
      </a>
      <span
        aria-disabled="true"
        title={dict.appStoreSoon}
        className={`${badgeClass} cursor-default select-none opacity-45`}
      >
        <AppleLogo />
        <span className="leading-tight">
          <span className="block text-[10px] uppercase tracking-[0.06em] opacity-80">
            {dict.appStoreSoon}
          </span>
          <span className="-mt-0.5 block text-[15px] font-semibold">
            {dict.appStoreName}
          </span>
        </span>
      </span>
    </div>
  );
}
