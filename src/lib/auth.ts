import "server-only";
import { cache } from "react";
import { getSupabaseAuthConfig } from "./supabase/config";
import { createSupabaseSessionClient } from "./supabase/session";

export const getAuthUserId = cache(async (): Promise<string | null> => {
  if (!getSupabaseAuthConfig()) return null;
  const supabase = await createSupabaseSessionClient();
  const { data, error } = await supabase.auth.getClaims();
  return !error && data?.claims.sub ? data.claims.sub : null;
});
