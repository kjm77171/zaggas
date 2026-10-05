import "server-only";
import { isNullableCreationType, type CreationType } from "./creationTypes";
import { isUuid, isTimestamp } from "@/app/projects/[id]/workspaceTypes";
import type { SupabaseClient } from "@supabase/supabase-js";
export type Project = { id: string; title: string | null; seed_sentence: string | null; initial_interest_codes: string[] | null; creation_type: CreationType | null; created_at: string; updated_at: string; last_writing_at: string | null; last_written_unit_id: string | null; manuscript_structure_revision: number };
function validWritingState(project: Project): boolean {
  return Number.isInteger(project.manuscript_structure_revision) && project.manuscript_structure_revision >= 0 && (project.last_writing_at === null || isTimestamp(project.last_writing_at)) && (project.last_written_unit_id === null || isUuid(project.last_written_unit_id));
}
const columns = "id,title,seed_sentence,initial_interest_codes,creation_type,created_at,updated_at,last_writing_at,last_written_unit_id,manuscript_structure_revision";
export async function getProjects(supabase: SupabaseClient, userId: string): Promise<Project[]> {
  const projects: Project[] = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase.from("projects").select(columns).eq("owner_id", userId).order("last_writing_at", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false }).order("id").range(offset, offset + 499);
    if (error || !data) throw new Error("이야기를 불러오지 못했습니다.");
    if (data.some(project => !isNullableCreationType(project.creation_type) || !validWritingState(project))) throw new Error("작품 형식을 확인하지 못했습니다.");
    projects.push(...data);
    if (data.length === 0) return projects;
    // Continue even after a short page: the server may impose a smaller row limit.
    offset += data.length;
  }
}
export async function getProjectForOwner(supabase: SupabaseClient, userId: string, projectId: string): Promise<Project | null> {
  const { data, error } = await supabase.from("projects").select(columns).eq("id", projectId).eq("owner_id", userId).maybeSingle();
  if (error) throw new Error("이야기를 불러오지 못했습니다.");
  if (data && (!isNullableCreationType(data.creation_type) || !validWritingState(data))) throw new Error("작품 형식을 확인하지 못했습니다.");
  return data;
}
