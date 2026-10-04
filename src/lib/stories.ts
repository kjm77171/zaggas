import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type Story = { id: string; title: string; content: string; created_at: string; updated_at: string };
export type StoryInput = Pick<Story, "title" | "content">;
const storyColumns = "id, title, content, created_at, updated_at";

export function isStoryId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export function validateStory(input: StoryInput): string | undefined {
  if (!input.title.trim()) return "제목을 입력해 주세요.";
  if (Array.from(input.title).length > 200) return "제목은 200자 이하로 입력해 주세요.";
  if (!input.content.trim()) return "본문을 입력해 주세요.";
  if (Array.from(input.content).length > 100000) return "본문은 100000자 이하로 입력해 주세요.";
}

export async function getStories(): Promise<Story[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.schema("public").from("stories").select(storyColumns).order("created_at", { ascending: false });
  if (error || !data) throw new Error("이야기를 불러오지 못했습니다.");
  return data;
}

export async function getStory(id: string): Promise<Story | null> {
  if (!isStoryId(id)) return null;
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.schema("public").from("stories").select(storyColumns).eq("id", id).maybeSingle();
  if (error) throw new Error("이야기를 불러오지 못했습니다.");
  return data;
}

export async function createStory(input: StoryInput): Promise<Story> {
  const message = validateStory(input);
  if (message) throw new Error(message);
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.schema("public").from("stories").insert(input).select(storyColumns).single();
  if (error || !data) throw new Error("이야기를 등록하지 못했습니다.");
  return data;
}

export async function updateStory(id: string, input: StoryInput): Promise<Story> {
  if (!isStoryId(id)) throw new Error("잘못된 이야기 주소입니다.");
  const message = validateStory(input);
  if (message) throw new Error(message);
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.schema("public").from("stories").update(input).eq("id", id).select(storyColumns).maybeSingle();
  if (error || !data) throw new Error("이야기를 수정하지 못했습니다. 작품이 삭제되었을 수 있습니다.");
  return data;
}

export async function deleteStory(id: string): Promise<void> {
  if (!isStoryId(id)) throw new Error("잘못된 이야기 주소입니다.");
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.schema("public").from("stories").delete().eq("id", id).select("id").maybeSingle();
  if (error || !data) throw new Error("이야기를 삭제하지 못했습니다. 작품이 이미 삭제되었을 수 있습니다.");
}
