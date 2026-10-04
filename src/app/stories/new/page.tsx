import Link from "next/link";
import StoryForm from "../storyForm";

export default function NewStoryPage() {
  return <main className="storyPage"><Link href="/stories">목록</Link><h1>새 이야기 쓰기</h1><StoryForm /></main>;
}
