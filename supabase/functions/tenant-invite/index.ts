// Sends a Supabase invitation / recovery email for an EXISTING tenant record.
//
// SECURITY model (reworked): the caller passes a tenant_id, never a free-form
// email or redirect URL. The tenant row is fetched through the caller's own
// RLS-scoped client, so the function only acts on tenants the caller can see
// (their own, or any for admins). The email comes from that row, and the
// redirect target is a fixed constant — an owner can no longer trigger
// service-role emails to arbitrary addresses or route recovery codes to an
// attacker-controlled URL.
//
// Modes:
//   * mode "invite"  — first-time invite via auth.admin.inviteUserByEmail.
//                      On success the function itself links the new auth user
//                      to the tenant row (tenants.auth_user_id is locked
//                      against client writes since migration 0068).
//   * mode "resend"  — for an already-invited tenant, sends a recovery email
//                      (Supabase rejects a second invite to the same address).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Inlined from _shared/cors.ts so the function deploys self-contained.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface Body {
  mode?: "invite" | "resend";
  tenant_id?: string;
}

const MOBILE_REDIRECT = "renters://reset-password";
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  const tenantId = body.tenant_id?.trim();
  if (!tenantId || !UUID_RE.test(tenantId)) {
    return jsonResponse({ error: "missing_tenant_id" }, 400);
  }

  // RLS does the authorization: owners only see their own tenants, admins all.
  const { data: tenant, error: tenantErr } = await userClient
    .from("tenants")
    .select("id, email, full_name, auth_user_id")
    .eq("id", tenantId)
    .maybeSingle();
  if (tenantErr) {
    return jsonResponse({ error: tenantErr.message }, 500);
  }
  if (!tenant) {
    return jsonResponse({ error: "tenant_not_found" }, 404);
  }
  const email = tenant.email?.trim();
  if (!email) return jsonResponse({ error: "tenant_has_no_email" }, 400);

  const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);

  if (mode === "resend") {
    const { error } = await adminClient.auth.resetPasswordForEmail(email, {
      redirectTo: MOBILE_REDIRECT,
    });
    if (error) {
      return jsonResponse({ error: error.message }, 500);
    }
    return jsonResponse({ ok: true, mode: "resend" });
  }

  // mode === "invite"
  if (tenant.auth_user_id) {
    return jsonResponse({ ok: false, error: "already_linked" }, 400);
  }

  const { data, error } = await adminClient.auth.admin.inviteUserByEmail(
    email,
    {
      data: { full_name: tenant.full_name ?? "", role: "tenant" },
      redirectTo: MOBILE_REDIRECT,
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

  // Link the freshly-created auth user to the tenant row server-side; the
  // column is not client-writable.
  const newUserId = data.user?.id ?? null;
  if (newUserId) {
    const { error: linkErr } = await adminClient
      .from("tenants")
      .update({ auth_user_id: newUserId })
      .eq("id", tenant.id)
      .is("auth_user_id", null);
    if (linkErr) {
      console.error("[tenant-invite] link failed:", linkErr.message);
    }
  }

  return jsonResponse({
    ok: true,
    mode: "invite",
    auth_user_id: newUserId,
  });
});
