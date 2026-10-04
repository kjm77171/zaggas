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
