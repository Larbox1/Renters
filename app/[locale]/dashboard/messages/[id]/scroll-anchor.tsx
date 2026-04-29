"use client";

import { useEffect, useRef } from "react";

/**
 * Renders an invisible element at the end of the messages list and scrolls
 * it into view whenever the conversation id or message count changes.
 *
 * Using both deps means:
 *   * Opening a conversation         → scrolls to the latest message
 *   * A new message arrives          → scrolls down to it
 *   * The 30s PollRefresh re-renders → no re-scroll if nothing actually
 *     changed, so the user's scroll-up-to-read-history is preserved
 */
export function ScrollAnchor({
  conversationId,
  messageCount,
}: {
  conversationId: string;
  messageCount: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.scrollIntoView({ block: "end" });
  }, [conversationId, messageCount]);

  return <div ref={ref} aria-hidden className="h-0" />;
}
