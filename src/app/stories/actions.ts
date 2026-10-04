"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createStory, updateStory, deleteStory, validateStory } from "@/lib/stories";

export type StoryFormState = { message: string; title: string; content: string };
export type DeleteStoryState = { message: string };

export async function saveStoryAction(id: string | null, previousState: StoryFormState, formData: FormData): Promise<StoryFormState> {
  void previousState;
  const titleValue = formData.get("title");
  const contentValue = formData.get("content");
  const input = { title: typeof titleValue === "string" ? titleValue : "", content: typeof contentValue === "string" ? contentValue : "" };
  const message = validateStory(input);
  if (message) return { ...input, message };

  let storyId: string;
  try {
    const story = id === null ? await createStory(input) : await updateStory(id, input);
    storyId = story.id;
  } catch {
    return { ...input, message: "저장하지 못했습니다. 연결 상태를 확인하고 다시 시도해 주세요. 작품이 삭제되었을 수도 있습니다." };
  }

  revalidatePath("/stories");
  revalidatePath(`/stories/${storyId}`);
  revalidatePath(`/stories/${storyId}/edit`);
  redirect(`/stories/${storyId}`);
}

export async function deleteStoryAction(id: string, previousState: DeleteStoryState, formData: FormData): Promise<DeleteStoryState> {
  void previousState;
  if (formData.get("confirmed") !== "yes") return { message: "삭제 확인이 필요합니다." };
  try {
    await deleteStory(id);
  } catch {
    return { message: "삭제하지 못했습니다. 연결 상태를 확인하고 다시 시도해 주세요. 작품이 이미 삭제되었을 수도 있습니다." };
  }
  revalidatePath("/stories");
  revalidatePath(`/stories/${id}`);
  redirect("/stories");
}
