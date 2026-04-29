// Issues a one-time signed upload URL for the "property-photos" bucket so the
// mobile client can PUT a photo directly to storage without ever holding the
// service-role key. The URL is scoped to a path under the property's id.
//
// Auth: caller must be authenticated. The bound JWT is used to verify the
// caller is the property's owner OR an admin before the function reaches for
// the service role.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

interface Body {
  property_id?: string;
  file_name?: string;
  mime_type?: string;
  size?: number;
}

const MAX_BYTES = 15 * 1024 * 1024;

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
  const callerId = userResult.user.id;

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "invalid_json" }, 400);
  }

  const { property_id, file_name, mime_type, size } = body;
  if (!property_id || !file_name) {
    return jsonResponse({ error: "missing_fields" }, 400);
  }
  if (typeof size === "number" && size > MAX_BYTES) {
    return jsonResponse({ error: "file_too_large" }, 413);
  }

  // Verify caller is the property's owner OR an admin.
  const { data: prop, error: propErr } = await userClient
    .from("properties")
    .select("owner_id")
    .eq("id", property_id)
    .maybeSingle();
  if (propErr) {
    return jsonResponse({ error: propErr.message }, 500);
  }
  if (!prop) {
    return jsonResponse({ error: "property_not_found" }, 404);
  }

  let isAdmin = false;
  if (prop.owner_id !== callerId) {
    const { data: profile } = await userClient
      .from("profiles")
      .select("role")
      .eq("id", callerId)
      .maybeSingle();
    isAdmin = profile?.role === "admin";
    if (!isAdmin) {
      return jsonResponse({ error: "forbidden" }, 403);
    }
  }

  const safeName = file_name.replace(/[^\w.\-]/g, "_");
  const path = `${property_id}/${Date.now()}-${safeName}`;

  const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: signed, error: signErr } = await adminClient.storage
    .from("property-photos")
    .createSignedUploadUrl(path);

  if (signErr || !signed) {
    return jsonResponse({ error: signErr?.message ?? "sign_failed" }, 500);
  }

  return jsonResponse({
    path,
    signed_url: signed.signedUrl,
    token: signed.token,
    name: file_name,
    mime_type: mime_type ?? "application/octet-stream",
  });
});
