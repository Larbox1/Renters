import Link from "next/link";

// Global 404 boundary for routes that never reach the [locale] segment (e.g.
// unmatched top-level or dotted paths the proxy skips). Those render through
// the pass-through root layout, so the html/body tags must live here — the
// localized layout that normally provides them is never entered.
export default function NotFound() {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center text-slate-900 antialiased">
        <p className="text-sm font-semibold text-brand-600">404</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">
          Page not found
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          The page you’re looking for doesn’t exist or has moved.
        </p>
        <Link
          href="/"
          className="mt-6 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Go home
        </Link>
      </body>
    </html>
  );
}
