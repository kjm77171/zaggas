import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { directionQuestions, emptyAnswer, parseDirectionAnswer, type DirectionAnswer, type DirectionRequest, type DirectionResult } from "./storyDirection";
export async function getDirectionAnswers(client: SupabaseClient, projectId: string): Promise<DirectionAnswer[]> {
  const { data, error } = await client.from("project_story_direction_answers").select("question_key,answer,question_set_version,revision,updated_at").eq("project_id", projectId).limit(5);
  if (error || !data || data.length > 4) throw new Error("이야기의 방향을 불러오지 못했습니다.");
  const rows = data.map(parseDirectionAnswer);
  if (rows.some(row => !row || row.revision === 0) || new Set(rows.map(row => row?.questionKey)).size !== rows.length) throw new Error("저장된 답변을 확인하지 못했습니다.");
  return directionQuestions.map(question => rows.find(row => row?.questionKey === question.key) ?? emptyAnswer(question.key));
}
export async function saveDirectionAnswer(client: SupabaseClient, input: DirectionRequest): Promise<DirectionResult> {
  const { data, error } = await client.rpc("zaggas_save_story_direction_answer", { p_project_id: input.projectId, p_question_key: input.questionKey, p_answer: input.answer, p_question_set_version: input.questionSetVersion, p_expected_revision: input.expectedRevision, p_request_id: input.requestId });
  if (error) return { status: "error", message: "저장 결과를 확인하지 못했습니다. 같은 요청으로 다시 시도하거나 최신 답변을 확인해 주세요." };
  const current = parseDirectionAnswer(data);
  if (!current || data.project_id !== input.projectId || current.questionKey !== input.questionKey || !["saved", "noop", "existing_retry", "conflict"].includes(data.status)) return { status: "error", message: "저장 결과를 확인하지 못했습니다. 같은 요청으로 다시 시도해 주세요." };
  if (data.status !== "conflict" && current.answer !== input.answer) return { status: "error", message: "저장된 답변을 확인하지 못했습니다. 같은 요청으로 다시 시도해 주세요." };
  return { status: data.status, current };
}
