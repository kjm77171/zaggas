"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseSessionClient } from "@/lib/supabase/session";
import { validateOnboardingDraft, isDraftId } from "@/app/firstExperience/draft";

export async function completeOnboarding(input: unknown): Promise<{ projectId: string; error?: never } | { error: string; projectId?: never }> {
  if (!validateOnboardingDraft(input)) return { error: "관심 분야와 문장을 다시 확인해 주세요." };
  try {
    const supabase = await createSupabaseSessionClient();
    const { data: identity, error: authError } = await supabase.auth.getClaims();
    const userId = identity?.claims.sub;
    if (authError || !userId) return { error: "로그인이 만료되었습니다. 카카오로 다시 시작해 주세요." };
    const { data: projectId, error } = await supabase.rpc("zaggas_complete_onboarding", {
      draft_id: input.draftId,
      interest_codes: input.selectedInterestIds,
      seed_sentence: input.sentence,
      guest_messages: [],
    });
    if (error || !isDraftId(projectId)) return { error: "이야기를 저장하지 못했습니다. 입력은 보관되어 있으니 다시 시도해 주세요." };
    const { data: project, error: projectError } = await supabase.from("projects").select("id").eq("id", projectId).eq("owner_id", userId).maybeSingle();
    if (projectError || !project) return { error: "저장 결과를 확인하지 못했습니다. 같은 이야기로 다시 시도해 주세요." };
    revalidatePath("/my");
    return { projectId: project.id };
  } catch {
    return { error: "이야기를 저장하지 못했습니다. 설정과 연결 상태를 확인하고 다시 시도해 주세요." };
  }
}

export async function signOut() {
  const supabase = await createSupabaseSessionClient();
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) throw new Error("로그아웃하지 못했습니다. 다시 시도해 주세요.");
  revalidatePath("/", "layout");
  redirect("/");
}

export async function ensureProfile(): Promise<{ error?: string }> {
  try {
    const supabase = await createSupabaseSessionClient();
    const { data, error: authError } = await supabase.auth.getClaims();
    const userId = data?.claims.sub;
    if (authError || !userId) return { error: "로그인이 만료되었습니다. 다시 로그인해 주세요." };
    const existing = await supabase.from("profiles").select("user_id").eq("user_id", userId).maybeSingle();
    if (existing.error) return { error: "사용자 정보를 확인하지 못했습니다. 다시 시도해 주세요." };
    if (!existing.data) {
      const inserted = await supabase.from("profiles").insert({ user_id: userId });
      if (inserted.error && inserted.error.code !== "23505") return { error: "사용자 정보를 준비하지 못했습니다. 다시 시도해 주세요." };
      const verified = await supabase.from("profiles").select("user_id").eq("user_id", userId).maybeSingle();
      if (verified.error || !verified.data) return { error: "사용자 정보를 확인하지 못했습니다. 다시 시도해 주세요." };
    }
    revalidatePath("/my");
    return {};
  } catch {
    return { error: "사용자 정보를 준비하지 못했습니다. 다시 시도해 주세요." };
  }
}
