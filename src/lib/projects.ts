import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type Project = { id: string; title: string; seed_sentence: string | null; created_at: string };

export async function getProjects(supabase: SupabaseClient, userId: string): Promise<Project[]> {
  const { data, error } = await supabase.from("projects").select("id,title,seed_sentence,created_at").eq("owner_id", userId).order("created_at", { ascending: false });
  if (error || !data) throw new Error("이야기를 불러오지 못했습니다.");
  return data;
}
