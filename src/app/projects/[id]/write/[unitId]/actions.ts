"use server";
import { createSupabaseSessionClient } from "@/lib/supabase/session";
import { isUuid } from "../../workspaceTypes";
import { normalizeProse, validProse, type ProseResult, type SaveSnapshot } from "@/lib/proseAutosave";
import { getProjectForOwner } from "@/lib/projects";
async function ownerClient(projectId: string) {
  const client = await createSupabaseSessionClient();
  const { data, error } = await client.auth.getClaims();
  if (error || !data?.claims.sub || !await getProjectForOwner(client, data.claims.sub, projectId)) return null;
  return client;
}
export async function saveProseAction(request: SaveSnapshot): Promise<ProseResult> {
  if (!request || !isUuid(request.projectId) || !isUuid(request.unitId) || !isUuid(request.requestId) || !validProse(request.content) || !Number.isInteger(request.expectedRevision) || request.expectedRevision < 0 || request.expectedRevision > 2147483647) return { status: "error", message: "원고와 저장 정보를 확인해 주세요. 입력은 유지됩니다." };
  try {
    const client = await ownerClient(request.projectId);
    if (!client) return { status: "error", message: "로그인과 작품 접근 권한을 확인해 주세요. 입력은 유지됩니다." };
    const { data, error } = await client.rpc("zaggas_save_prose_unit", { p_project_id: request.projectId, p_unit_id: request.unitId, p_content: request.content, p_expected_revision: request.expectedRevision, p_request_id: request.requestId });
    if (error) return error.code === "22023" || error.code === "42501" || error.code === "22003" ? { status: "error", message: "저장 조건을 확인하지 못했습니다. 입력은 보관됩니다." } : { status: "unknown", message: "저장 결과를 확인하지 못했습니다. 같은 요청으로 다시 확인해 주세요." };
    const row = data?.unit;
    if (!row || row.id !== request.unitId || row.project_id !== request.projectId || row.content_format !== "PROSE" || row.deleted_at !== null || !validProse(row.content) || !Number.isInteger(row.revision) || row.revision < 0) return { status: "unknown", message: "저장 응답을 확인하지 못했습니다. 같은 요청으로 다시 확인해 주세요." };
    const current = { content: row.content as string | null, revision: row.revision as number };
    if (data.status === "conflict") return { status: "conflict", current };
    const contentMatches = current.content === normalizeProse(request.content);
    const ack = data.status === "noop" ? current.revision === request.expectedRevision : (data.status === "saved" || data.status === "existing_retry") && current.revision === request.expectedRevision + 1 && row.last_request_id === request.requestId;
    if (!ack || !contentMatches) return { status: "unknown", message: "저장 응답을 확인하지 못했습니다. 같은 요청으로 다시 확인해 주세요." };
    return { status: data.status, current };
  } catch { return { status: "unknown", message: "저장 결과를 확인하지 못했습니다. 같은 요청으로 다시 확인해 주세요." }; }
}
export async function readProseAction(projectId: string, unitId: string) {
  if (!isUuid(projectId) || !isUuid(unitId)) return null;
  try {
    const client = await ownerClient(projectId); if (!client) return null;
    const { data, error } = await client.from("manuscript_units").select("content,revision").eq("id", unitId).eq("project_id", projectId).eq("content_format", "PROSE").is("deleted_at", null).maybeSingle();
    if (error || !data || !validProse(data.content) || !Number.isInteger(data.revision) || data.revision < 0) return null;
    return { content: data.content as string | null, revision: data.revision as number };
  } catch { return null; }
}
