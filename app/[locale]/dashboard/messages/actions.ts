"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isLocale, defaultLocale } from "@/i18n/config";
import { getCurrentSession } from "@/lib/auth/current-user";
import {
  ATTACHMENTS_BUCKET,
  uploadAttachments,
  MAX_FILES_PER_MESSAGE,
  type StoredAttachment,
} from "@/lib/messages/attachments";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import { checkStorageQuota } from "@/lib/storage/quota";

export type SendMessageState = { error?: string };

function getLocale(formData: FormData) {
  const raw = String(formData.get("locale") ?? "");
  return isLocale(raw) ? raw : defaultLocale;
}

function randomMessageId(): string {
  // Node 19+ / browser support; available in Next runtimes.
  return crypto.randomUUID();
}

export async function sendMessageAction(
  _prev: SendMessageState,
  formData: FormData,
): Promise<SendMessageState> {
  const locale = getLocale(formData);
  const session = await getCurrentSession();
  if (!session) redirect(`/${locale}/login`);

  const recipientId = String(formData.get("recipient_id") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim() || null;
  const body = String(formData.get("body") ?? "").trim();
  const files = formData
    .getAll("files")
    .filter((f): f is File => f instanceof File && f.size > 0);

  if (!recipientId || !body) {
    return { error: "missing_fields" };
  }
  if (files.length > MAX_FILES_PER_MESSAGE) {
    return { error: "too_many_files" };
  }

  const attachmentBytes = files.reduce((sum, f) => sum + f.size, 0);
  const quotaError = await checkStorageQuota(session, attachmentBytes);
  if (quotaError) return { error: quotaError };

  // Pre-allocate the message id so file paths can be scoped to it.
  const messageId = randomMessageId();

  let attachments;
  try {
    attachments = await uploadAttachments(files, messageId);
  } catch (err) {
    console.error("[messages.send] upload failed:", err);
    return {
      error: err instanceof Error ? err.message : "upload_failed",
    };
  }

  // The INSERT RLS policy enforces messaging rules via can_message().
  const { error } = await session.supabase.from("messages").insert({
    id: messageId,
    sender_id: session.user.id,
    recipient_id: recipientId,
    subject,
    body,
    attachments,
  });

  if (error) {
    console.error("[messages.send] insert failed:", error);
    return { error: error.message };
  }

  revalidatePath(`/${locale}/dashboard/messages`);
  redirect(`/${locale}/dashboard/messages/${recipientId}`);
}

export async function markConversationReadAction(otherUserId: string) {
  const session = await getCurrentSession();
  if (!session) return;
  await session.supabase.rpc("mark_conversation_read", {
    other_user_id: otherUserId,
  });
}

export type EditMessageState = { error?: string };

export async function editMessageAction(
  _prev: EditMessageState,
  formData: FormData,
): Promise<EditMessageState> {
  const session = await getCurrentSession();
  if (!session) return { error: "no_session" };

  const messageId = String(formData.get("message_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();

  if (!messageId || !body) {
    return { error: "missing_fields" };
  }

  // RLS restricts the update to: sender_id = auth.uid() AND read_at IS NULL.
  // A read message produces 0 affected rows, no error — we don't surface
  // that, the UI simply won't show edit buttons once read.
  const { error } = await session.supabase
    .from("messages")
    .update({ body })
    .eq("id", messageId);

  if (error) {
    console.error("[messages.edit] failed:", error);
    return { error: error.message };
  }

  // Revalidate every dashboard route — both the conversation view and the
  // conversation list (which shows the last-message preview).
  const locale = String(formData.get("locale") ?? defaultLocale);
  const safeLocale = isLocale(locale) ? locale : defaultLocale;
  revalidatePath(`/${safeLocale}/dashboard/messages`, "layout");
  return {};
}

export async function deleteMessageAction(formData: FormData) {
  const session = await getCurrentSession();
  if (!session) return;

  const messageId = String(formData.get("message_id") ?? "");
  if (!messageId) return;

  // Fetch attachments first so we can clean up storage after the row is gone.
  const { data: msg } = await session.supabase
    .from("messages")
    .select("attachments, sender_id, read_at")
    .eq("id", messageId)
    .maybeSingle();

  // RLS gates the delete (sender + unread). Returns 0 affected rows otherwise.
  const { error } = await session.supabase
    .from("messages")
    .delete()
    .eq("id", messageId);

  if (error) {
    console.error("[messages.delete] failed:", error);
    return;
  }

  // Best-effort attachment cleanup. If the service-role key isn't available
  // the files become orphans — non-fatal.
  const attachments = (msg?.attachments ?? []) as StoredAttachment[];
  if (attachments.length > 0 && hasServiceRoleKey()) {
    try {
      const admin = createAdminClient();
      await admin.storage
        .from(ATTACHMENTS_BUCKET)
        .remove(attachments.map((a) => a.path));
    } catch (err) {
      console.error("[messages.delete] storage cleanup failed:", err);
    }
  }

  const locale = String(formData.get("locale") ?? defaultLocale);
  const safeLocale = isLocale(locale) ? locale : defaultLocale;
  revalidatePath(`/${safeLocale}/dashboard/messages`, "layout");
}
