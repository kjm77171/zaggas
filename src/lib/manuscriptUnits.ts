import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isUuid, isTimestamp } from "@/app/projects/[id]/workspaceTypes";
import type { ManuscriptUnit, ScreenplayBlock } from "./manuscriptTypes";
const columns = "id,project_id,title,content,content_format,revision,created_at,updated_at";
function parseUnit(value: unknown, projectId: string): ManuscriptUnit {
  if (!value || typeof value !== "object") throw new Error("원고를 확인하지 못했습니다.");
  const row = value as Record<string, unknown>;
  if (!isUuid(row.id) || row.project_id !== projectId || !(row.title === null || typeof row.title === "string") || !(row.content === null || typeof row.content === "string") || !["PROSE", "SCREENPLAY_BLOCKS"].includes(String(row.content_format)) || (row.content_format === "SCREENPLAY_BLOCKS" && row.content !== null) || !Number.isInteger(row.revision) || Number(row.revision) < 0 || !isTimestamp(row.created_at) || !isTimestamp(row.updated_at)) throw new Error("원고를 확인하지 못했습니다.");
  return row as ManuscriptUnit;
}
// 호출자는 먼저 owner Project를 조회한다. 실제 row 접근은 session RLS가 다시 제한한다.
export async function getActiveUnits(client: SupabaseClient, projectId: string): Promise<ManuscriptUnit[]> {
  const units: ManuscriptUnit[] = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await client.from("manuscript_units").select(columns).eq("project_id", projectId).is("deleted_at", null).order("position").order("id").range(offset, offset + 499);
    if (error || !data) throw new Error("원고를 불러오지 못했습니다.");
    units.push(...data.map(row => parseUnit(row, projectId)));
    if (!data.length) return units;
    offset += data.length;
  }
}
export async function getScreenplayBlocks(client: SupabaseClient, unitId: string): Promise<ScreenplayBlock[]> {
  const { data, error } = await client.from("screenplay_blocks").select("id,block_type,content").eq("unit_id", unitId).order("position").order("id");
  if (error || !data) throw new Error("장면을 불러오지 못했습니다.");
  return data.map(row => {
    if (!isUuid(row.id) || !["SCENE_HEADING", "ACTION", "CHARACTER", "DIALOGUE"].includes(row.block_type) || !(row.content === null || typeof row.content === "string")) throw new Error("장면을 확인하지 못했습니다.");
    return row as ScreenplayBlock;
  });
}
export async function getUnitSummaries(client: SupabaseClient, projectIds: string[]): Promise<Map<string, { count: number; ids: string[] }>> {
  const result = new Map<string, { count: number; ids: string[] }>();
  for (let start = 0; start < projectIds.length; start += 100) {
    let offset = 0;
    for (;;) {
      const { data, error } = await client.from("manuscript_units").select("id,project_id").in("project_id", projectIds.slice(start, start + 100)).is("deleted_at", null).order("id").range(offset, offset + 499);
      if (error || !data) throw new Error("원고 상태를 확인하지 못했습니다.");
      if (!data.length) break;
      for (const row of data) {
        if (!isUuid(row.id) || !projectIds.includes(row.project_id)) throw new Error("원고 연결을 확인하지 못했습니다.");
        const previous = result.get(row.project_id) ?? { count: 0, ids: [] };
        previous.count += 1; previous.ids.push(row.id); result.set(row.project_id, previous);
      }
      offset += data.length;
    }
  }
  return result;
}
