"use server";
import { revalidatePath } from "next/cache";
import { createSupabaseSessionClient } from "@/lib/supabase/session";
import { getProjectForOwner } from "@/lib/projects";
import { createProjectManuscript, updateProjectManuscript, getProjectManuscript } from "@/lib/projectStories";
import { isUuid, validateContent, type SaveResult } from "./workspaceTypes";
type SaveInput = { projectId: string; storyId: string; content: string; expectedUpdatedAt?: string };
async function save(input: unknown, creating: boolean): Promise<SaveResult> {
  if (!input || typeof input !== "object") return { kind: "error", message: "저장할 내용을 확인해 주세요." };
  const value = input as Partial<SaveInput>;
  const invalidContent = validateContent(value.content);
  if (!isUuid(value.projectId) || !isUuid(value.storyId) || invalidContent || typeof value.content !== "string") return { kind: "error", message: invalidContent ?? "이야기 주소를 확인해 주세요." };
  if (!creating && (typeof value.expectedUpdatedAt !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(value.expectedUpdatedAt) || !Number.isFinite(Date.parse(value.expectedUpdatedAt)))) return { kind: "error", message: "저장 시각을 확인하지 못했습니다. 최신 내용을 다시 불러와 주세요." };
  try {
    const client = await createSupabaseSessionClient();
    const { data, error } = await client.auth.getClaims();
    const userId = data?.claims.sub;
    if (error || !userId) return { kind: "authRequired", message: "로그인이 만료되었습니다. 원고를 복사해 둔 뒤 다시 로그인해 주세요." };
    if (!await getProjectForOwner(client, userId, value.projectId)) return { kind: "conflict", message: "이 작업에 접근할 수 없습니다. 작성한 내용은 그대로 두었습니다." };
    if (!creating) {
      const current = await getProjectManuscript(client, userId, value.projectId);
      if (current.kind !== "single" || current.manuscript.id !== value.storyId) return { kind: "conflict", message: "원고 구성이 변경되었습니다. 작성한 내용은 그대로 두었습니다. 최신 상태를 확인해 주세요." };
    }
    const result = creating ? await createProjectManuscript(client, value.projectId, value.storyId, value.content) : await updateProjectManuscript(client, userId, value.projectId, value.storyId, value.content, value.expectedUpdatedAt!);
    if (result.kind === "saved") {
      revalidatePath("/my");
      revalidatePath(`/projects/${value.projectId}`);
    }
    return result;
  } catch {
    return { kind: "error", message: "저장 결과를 확인하지 못했습니다. 작성한 내용은 그대로 두었습니다." };
  }
}
export async function createManuscriptAction(input: unknown): Promise<SaveResult> { return save(input, true); }
export async function saveManuscriptAction(input: unknown): Promise<SaveResult> { return save(input, false); }
