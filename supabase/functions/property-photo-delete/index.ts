// Deletes a photo file from the "property-photos" bucket.
// Caller must own the property (or be an admin) and the path must be prefixed
// with the property's id, so a caller cannot ask us to delete a different
// property's files.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

interface Body {
  property_id?: string;
  path?: string;
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
  const callerId = userResult.user.id;

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "invalid_json" }, 400);
  }

  const { property_id, path } = body;
  if (!property_id || !path) {
    return jsonResponse({ error: "missing_fields" }, 400);
  }
  if (!path.startsWith(`${property_id}/`)) {
    return jsonResponse({ error: "path_property_mismatch" }, 400);
  }

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

  if (prop.owner_id !== callerId) {
    const { data: profile } = await userClient
      .from("profiles")
      .select("role")
      .eq("id", callerId)
      .maybeSingle();
    if (profile?.role !== "admin") {
      return jsonResponse({ error: "forbidden" }, 403);
    }
  }

  const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);
  const { error: rmErr } = await adminClient.storage
    .from("property-photos")
    .remove([path]);
  if (rmErr) {
    return jsonResponse({ error: rmErr.message }, 500);
  }

  return jsonResponse({ ok: true });
});
