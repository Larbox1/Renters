// Sends a Supabase magic-link invitation to a prospective tenant.
//
// Modes:
//   * mode "invite"  — first-time invite via auth.admin.inviteUserByEmail.
//                      Returns the new auth.users id so the caller can store
//                      it on the tenants row.
//   * mode "resend"  — for an already-invited tenant, sends a recovery email
//                      (Supabase rejects a second invite to the same address).
//
// Caller must be an owner or admin. The redirect_to is supplied by the caller
// so this works for both the web app (https://…/auth/callback?next=…) and
// mobile (renters://reset-password).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

interface Body {
  mode?: "invite" | "resend";
  email?: string;
  full_name?: string;
  redirect_to?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  const auth = req.headers.get("Authorization");
  if (!auth) return jsonResponse({ error: "unauthenticated" }, 401);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
    return jsonResponse({ error: "server_misconfigured" }, 500);
  }

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: auth } },
  });

  const { data: userResult, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userResult?.user) {
    return jsonResponse({ error: "unauthenticated" }, 401);
  }

  const { data: profile } = await userClient
    .from("profiles")
    .select("role")
    .eq("id", userResult.user.id)
    .maybeSingle();
  const role = profile?.role;
  if (role !== "owner" && role !== "admin") {
    return jsonResponse({ error: "forbidden" }, 403);
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "invalid_json" }, 400);
  }

  const mode = body.mode ?? "invite";
  const email = body.email?.trim();
  if (!email) return jsonResponse({ error: "missing_email" }, 400);

  const fullName = body.full_name?.trim() ?? "";
  const redirectTo = body.redirect_to?.trim() || "renters://reset-password";

  const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);

  if (mode === "resend") {
    const { error } = await adminClient.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    if (error) {
      return jsonResponse({ error: error.message }, 500);
    }
    return jsonResponse({ ok: true, mode: "resend" });
  }

  // mode === "invite"
  const { data, error } = await adminClient.auth.admin.inviteUserByEmail(
    email,
    {
      data: { full_name: fullName, role: "tenant" },
      redirectTo,
    },
  );

  if (error) {
    // Surface duplicate / already-registered errors so the client can fall
    // back to the resend path.
    return jsonResponse(
      { ok: false, error: error.message, code: (error as any).code ?? null },
      400,
    );
  }

  return jsonResponse({
    ok: true,
    mode: "invite",
    auth_user_id: data.user?.id ?? null,
  });
});
