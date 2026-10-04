import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { getStory } from "@/lib/stories";
import StoryForm from "../../storyForm";

export default async function EditStoryPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const story = await getStory(id);
  if (!story) notFound();
  return <main className="storyPage"><Link href={`/stories/${story.id}`}>상세</Link><h1>이야기 수정</h1><StoryForm id={story.id} title={story.title} content={story.content} /></main>;
}
