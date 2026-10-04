import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { getStory } from "@/lib/stories";
import DeleteStoryButton from "../deleteStoryButton";

export default async function StoryPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const story = await getStory(id);
  if (!story) notFound();
  return (
    <main className="storyPage">
      <Link href="/stories">목록</Link>
      <h1>{story.title}</h1>
      <div className="dates"><p>생성일 <time dateTime={story.created_at}>{new Date(story.created_at).toISOString()}</time></p><p>수정일 <time dateTime={story.updated_at}>{new Date(story.updated_at).toISOString()}</time></p></div>
      <article className="storyContent">{story.content}</article>
      <div className="actions"><Link href={`/stories/${story.id}/edit`} className="button">수정</Link><DeleteStoryButton id={story.id} /></div>
    </main>
  );
}
