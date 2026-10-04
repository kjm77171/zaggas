import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isUuid, type ManuscriptData, type ManuscriptLoad, type SaveResult } from "@/app/projects/[id]/workspaceTypes";
const columns = "id,project_id,content,created_at,updated_at";
function parseManuscript(value: unknown, projectId: string, storyId?: string): ManuscriptData | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (!isUuid(row.id) || row.project_id !== projectId || (storyId && row.id !== storyId) || typeof row.content !== "string" || typeof row.created_at !== "string" || typeof row.updated_at !== "string" || !Number.isFinite(Date.parse(row.created_at)) || !Number.isFinite(Date.parse(row.updated_at))) return null;
  return { id: row.id, projectId, content: row.content, createdAt: row.created_at, updatedAt: row.updated_at };
}
export async function getProjectManuscript(client: SupabaseClient, userId: string, projectId: string): Promise<ManuscriptLoad> {
  const { data, error } = await client.from("stories").select(columns).eq("owner_id", userId).eq("project_id", projectId).order("id").limit(2);
  if (error || !data) throw new Error("원고를 불러오지 못했습니다.");
  if (data.length >= 2) return { kind: "multiple" };
  if (!data.length) return { kind: "empty" };
  const manuscript = parseManuscript(data[0], projectId);
  if (!manuscript) throw new Error("원고를 확인하지 못했습니다.");
  return { kind: "single", manuscript };
}
export async function getProjectStorySummaries(client: SupabaseClient, userId: string, projectIds: string[]) {
  const summaries = new Map<string, { count: number; updatedAt: string }>();
  for (let start = 0; start < projectIds.length; start += 100) {
    const ids = projectIds.slice(start, start + 100);
    let offset = 0;
    for (;;) {
      const { data, error } = await client.from("stories").select("id,project_id,updated_at").eq("owner_id", userId).in("project_id", ids).order("id").range(offset, offset + 499);
      if (error || !data) throw new Error("원고 저장 상태를 확인하지 못했습니다.");
      if (!data.length) break;
      for (const row of data) {
        const previous = summaries.get(row.project_id);
        summaries.set(row.project_id, { count: (previous?.count ?? 0) + 1, updatedAt: previous && Date.parse(previous.updatedAt) > Date.parse(row.updated_at) ? previous.updatedAt : row.updated_at });
      }
      offset += data.length;
    }
  }
  return summaries;
}
export async function createProjectManuscript(client: SupabaseClient, projectId: string, storyId: string, content: string): Promise<SaveResult> {
  const { data, error } = await client.rpc("zaggas_create_project_manuscript", { p_project_id: projectId, p_story_id: storyId, p_content: content });
  if (error) {
    if (["55000", "40001", "23505"].includes(error.code)) return { kind: "conflict", message: "원고가 이미 존재하거나 저장 상태를 확인할 수 없습니다. 작성한 내용은 그대로 두었습니다." };
    return { kind: "error", message: "저장하지 못했습니다. 같은 저장 요청으로 다시 시도해 주세요." };
  }
  const manuscript = parseManuscript(data, projectId, storyId);
  const status = data?.status;
  if (!manuscript || manuscript.content !== content || (status !== "created" && status !== "existing_retry")) return { kind: "error", message: "저장 결과를 확인하지 못했습니다. 같은 요청으로 다시 시도해 주세요." };
  return { kind: "saved", manuscript, status };
}
export async function updateProjectManuscript(client: SupabaseClient, userId: string, projectId: string, storyId: string, content: string, expectedUpdatedAt: string): Promise<SaveResult> {
  const { data, error } = await client.from("stories").update({ content }).eq("id", storyId).eq("project_id", projectId).eq("owner_id", userId).eq("updated_at", expectedUpdatedAt).select(columns).maybeSingle();
  if (error) return { kind: "error", message: "저장 결과를 확인하지 못했습니다. 입력은 그대로 두었습니다. 다시 시도하거나 최신 내용을 확인해 주세요." };
  if (!data) return { kind: "conflict", message: "다른 곳에서 원고가 변경되었거나 현재 저장 상태를 확인할 수 없습니다. 작성한 내용은 그대로 두었습니다." };
  const manuscript = parseManuscript(data, projectId, storyId);
  if (!manuscript || manuscript.content !== content) return { kind: "error", message: "저장 결과를 확인하지 못했습니다. 최신 내용을 확인해 주세요." };
  return { kind: "saved", manuscript };
}
