import "server-only";
import { createClient } from "@supabase/supabase-js";

export class SupabaseConfigurationError extends Error {}

export function createSupabaseServerClient() {
  if (process.env.NODE_ENV !== "development") {
    throw new SupabaseConfigurationError("Auth 도입 전 Supabase 조회는 로컬 개발 모드에서만 허용됩니다.");
  }

  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY?.trim();

  if (!supabaseUrl || !supabaseSecretKey) {
    throw new SupabaseConfigurationError(".env.local에 SUPABASE_URL과 SUPABASE_SECRET_KEY를 입력하고 개발 서버를 재시작하세요.");
  }

  try {
    const url = new URL(supabaseUrl);
    if (url.protocol !== "https:" || url.username || url.password || !supabaseSecretKey.startsWith("sb_secret_")) {
      throw new Error("Invalid configuration");
    }
    return createClient(supabaseUrl, supabaseSecretKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
    });
  } catch {
    throw new SupabaseConfigurationError("Supabase 설정 형식을 확인하세요. HTTPS Project URL과 Secret key가 필요합니다.");
  }
}
