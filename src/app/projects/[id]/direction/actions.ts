"use server";
import { createSupabaseSessionClient } from "@/lib/supabase/session";
import { getProjectForOwner } from "@/lib/projects";
import { saveDirectionAnswer } from "@/lib/storyDirectionData";
import { isQuestionKey, normalizeAnswer, validAnswer, type DirectionRequest, type DirectionResult } from "@/lib/storyDirection";
import { isUuid } from "../workspaceTypes";
export async function saveDirectionAction(input: unknown): Promise<DirectionResult> {
  if (!input || typeof input !== "object") return { status: "error", message: "저장할 답변을 확인해 주세요." };
  const value = input as Partial<DirectionRequest>;
  if (!isUuid(value.projectId) || !isUuid(value.requestId) || !isQuestionKey(value.questionKey) || !validAnswer(value.answer) || value.questionSetVersion !== 1 || !Number.isInteger(value.expectedRevision) || value.expectedRevision! < 0 || value.expectedRevision! > 2147483647) return { status: "error", message: "답변과 저장 정보를 확인해 주세요. 답변은 2,000자까지 저장할 수 있습니다." };
  try {
    const client = await createSupabaseSessionClient();
    const { data, error } = await client.auth.getClaims();
    if (error || !data?.claims.sub) return { status: "error", message: "로그인이 만료되었습니다. 답변을 보관한 뒤 다시 로그인해 주세요." };
    if (!await getProjectForOwner(client, data.claims.sub, value.projectId)) return { status: "error", message: "이 작업에 접근할 수 없습니다." };
    return await saveDirectionAnswer(client, { ...value, answer: normalizeAnswer(value.answer) } as DirectionRequest);
  } catch { return { status: "error", message: "저장 결과를 확인하지 못했습니다. 같은 요청으로 다시 시도해 주세요." }; }
}
