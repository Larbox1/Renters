// Placeholder "Continue with Apple" — disabled until Apple sign-in ships.
// When it does: add "use client", mirror GoogleAuthButton with
// signInWithOAuth({ provider: "apple" }).
export function AppleAuthButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      disabled
      className="flex w-full cursor-not-allowed items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 opacity-60 shadow-sm"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M16.365 1.43c0 1.14-.417 2.2-1.253 3.083-.897.973-2.093 1.536-3.12 1.454-.05-1.09.457-2.213 1.263-3.06.87-.94 2.19-1.55 3.11-1.477zM20.94 17.06c-.53 1.23-.786 1.78-1.47 2.87-.955 1.52-2.3 3.41-3.966 3.42-1.48.02-1.86-.96-3.87-.95-2.01.01-2.43.98-3.91.96-1.665-.02-2.94-1.73-3.895-3.25C1.16 15.89.885 11.32 2.61 8.9c1.22-1.72 3.15-2.73 4.96-2.73 1.845 0 3.005 1.01 4.53 1.01 1.48 0 2.38-1.01 4.51-1.01 1.615 0 3.325.88 4.545 2.4-3.995 2.19-3.35 7.89-.215 8.49z" />
      </svg>
      {label}
    </button>
  );
}
