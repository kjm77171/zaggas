import Link from "next/link";
import { connection } from "next/server";
import { getStories } from "@/lib/stories";

export default async function StoriesPage() {
  await connection();
  const stories = await getStories();
  return (
    <main className="storyPage">
      <Link href="/" className="brand">ZAGGAS</Link>
      <h1>Stories</h1>
      <Link href="/stories/new" className="button">새 이야기 쓰기</Link>
      {stories.length === 0 ? <section className="empty"><p>아직 이야기가 없습니다.</p><p>첫 이야기를 시작해보세요.</p></section> : (
        <ul className="storyList">{stories.map((story) => <li key={story.id}><Link href={`/stories/${story.id}`}>{story.title}</Link><time dateTime={story.created_at}>{new Date(story.created_at).toISOString()}</time></li>)}</ul>
      )}
    </main>
  );
}
