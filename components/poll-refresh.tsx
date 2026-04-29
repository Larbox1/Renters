"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Periodically calls router.refresh() so server components re-execute and
 * pull fresh data. The browser performs a soft refetch — no page reload,
 * no scroll jump.
 */
export function PollRefresh({ intervalMs = 10000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);
  return null;
}
