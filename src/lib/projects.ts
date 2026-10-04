import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
export type Project = { id: string; title: string; seed_sentence: string | null; initial_interest_codes: string[] | null; creation_type: string | null; created_at: string; updated_at: string };
const columns = "id,title,seed_sentence,initial_interest_codes,creation_type,created_at,updated_at";
export async function getProjects(supabase: SupabaseClient, userId: string): Promise<Project[]> {
  const projects: Project[] = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase.from("projects").select(columns).eq("owner_id", userId).order("created_at", { ascending: false }).order("id").range(offset, offset + 499);
    if (error || !data) throw new Error("이야기를 불러오지 못했습니다.");
    projects.push(...data);
    if (data.length === 0) return projects;
    // Continue even after a short page: the server may impose a smaller row limit.
    offset += data.length;
  }
}
export async function getProjectForOwner(supabase: SupabaseClient, userId: string, projectId: string): Promise<Project | null> {
  const { data, error } = await supabase.from("projects").select(columns).eq("id", projectId).eq("owner_id", userId).maybeSingle();
  if (error) throw new Error("이야기를 불러오지 못했습니다.");
  return data;
}
