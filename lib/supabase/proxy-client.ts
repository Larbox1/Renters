import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseEnv } from "./env";

export async function refreshSession(
  request: NextRequest,
  response: NextResponse,
): Promise<NextResponse> {
  const { url, anonKey } = getSupabaseEnv();

  let workingResponse = response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        workingResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          workingResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // Touching getUser() triggers Supabase to refresh the session cookie if needed.
  await supabase.auth.getUser();

  return workingResponse;
}
