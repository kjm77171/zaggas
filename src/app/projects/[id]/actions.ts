"use server";
import { revalidatePath } from "next/cache";
import { createSupabaseSessionClient } from "@/lib/supabase/session";
import { getProjectForOwner } from "@/lib/projects";
import { createProjectManuscript, createTitledProjectManuscript, updateProjectManuscript, getProjectManuscript } from "@/lib/projectStories";
import { isUuid, isTimestamp, validateTitle, validateContent, type SaveResult, type TitleResult } from "./workspaceTypes";
type SaveInput = { projectId: string; storyId: string; content: string; expectedUpdatedAt?: string; title?: string; expectedProjectUpdatedAt?: string };
async function save(input: unknown, creating: boolean, titled = false): Promise<SaveResult> {
  if (!input || typeof input !== "object") return { kind: "error", message: "저장할 내용을 확인해 주세요." };
  const value = input as Partial<SaveInput>;
  const invalidContent = validateContent(value.content);
  if (!isUuid(value.projectId) || !isUuid(value.storyId) || invalidContent || typeof value.content !== "string") return { kind: "error", message: invalidContent ?? "이야기 주소를 확인해 주세요." };
  if (!creating && (typeof value.expectedUpdatedAt !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(value.expectedUpdatedAt) || !Number.isFinite(Date.parse(value.expectedUpdatedAt)))) return { kind: "error", message: "저장 시각을 확인하지 못했습니다. 최신 내용을 다시 불러와 주세요." };
  if (titled && (validateTitle(value.title) || !isTimestamp(value.expectedProjectUpdatedAt))) return { kind: "error", message: validateTitle(value.title) ?? "작업 시각을 확인하지 못했습니다. 최신 정보를 불러와 주세요." };
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
    const result = titled ? await createTitledProjectManuscript(client, value.projectId, value.storyId, value.content, value.title!, value.expectedProjectUpdatedAt!) : creating ? await createProjectManuscript(client, value.projectId, value.storyId, value.content) : await updateProjectManuscript(client, userId, value.projectId, value.storyId, value.content, value.expectedUpdatedAt!);
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

export async function createTitledManuscriptAction(input: unknown): Promise<SaveResult> { return save(input, true, true); }
export async function renameProjectAction(input: unknown): Promise<TitleResult> {
  if (!input || typeof input !== "object") return { kind: "error", message: "제목을 확인해 주세요." };
  const value = input as { projectId?: unknown; title?: unknown; expectedProjectUpdatedAt?: unknown };
  const invalid = validateTitle(value.title);
  if (!isUuid(value.projectId) || invalid || typeof value.title !== "string" || !isTimestamp(value.expectedProjectUpdatedAt)) return { kind: "error", message: invalid ?? "작업 정보를 확인해 주세요." };
  try {
    const client = await createSupabaseSessionClient();
    const { data: claims, error: authError } = await client.auth.getClaims();
    const userId = claims?.claims.sub;
    if (authError || !userId) return { kind: "authRequired", message: "로그인이 만료되었습니다. 입력을 보관한 뒤 다시 로그인해 주세요." };
    const project = await getProjectForOwner(client, userId, value.projectId);
    if (!project) return { kind: "conflict", message: "이 작업에 접근할 수 없습니다. 입력은 그대로 두었습니다." };
    const manuscript = await getProjectManuscript(client, userId, value.projectId);
    if (manuscript.kind === "multiple" || (project.title === null && manuscript.kind === "empty")) return { kind: "conflict", message: "현재 작업 상태를 다시 확인해 주세요. 입력은 그대로 두었습니다." };
    const { data, error } = await client.from("projects").update({ title: value.title })
      .eq("id", value.projectId).eq("owner_id", userId).eq("updated_at", value.expectedProjectUpdatedAt)
      .select("id,title,updated_at").maybeSingle();
    if (error) return { kind: "error", message: "제목 저장을 확인하지 못했습니다. 입력은 그대로 두었습니다." };
    if (!data) return { kind: "conflict", message: "다른 곳에서 작업 정보가 변경되었습니다. 입력한 제목은 그대로 두었습니다." };
    if (data.id !== value.projectId || data.title !== value.title || !isTimestamp(data.updated_at)) return { kind: "error", message: "제목 저장 결과를 확인하지 못했습니다. 최신 정보를 확인해 주세요." };
    revalidatePath("/my");
    revalidatePath(`/projects/${value.projectId}`);
    return { kind: "saved", project: { title: data.title, updatedAt: data.updated_at } };
  } catch {
    return { kind: "error", message: "제목 저장 결과를 확인하지 못했습니다. 입력은 그대로 두었습니다." };
  }
}
