"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseAuthConfig } from "./config";

export function createSupabaseBrowserClient() {
  const config = getSupabaseAuthConfig();
  if (!config) throw new Error("로그인 환경설정을 준비하고 있습니다. 설정 완료 후 다시 시도해 주세요.");
  return createBrowserClient(config.url, config.key);
}
