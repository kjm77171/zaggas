import { NextResponse } from "next/server";
import { createSupabaseSessionClient } from "@/lib/supabase/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  let destination = "/auth/complete?error=oauth";
  try {
    const supabase = await createSupabaseSessionClient();
    const code = url.searchParams.get("code");
    if (code && !url.searchParams.has("error")) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) destination = "/auth/complete";
      else {
        // A duplicated callback can recover if its first request set a valid session.
        const { data } = await supabase.auth.getClaims();
        if (data?.claims.sub) destination = "/auth/complete";
      }
    }
  } catch {
    // Provider errors and configuration details must not be reflected in the URL.
  }
  const response = NextResponse.redirect(new URL(destination, url.origin));
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  return response;
}
