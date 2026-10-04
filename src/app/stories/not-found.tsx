import Link from "next/link";

export default function StoryNotFound() {
  return <main className="storyPage"><h1>이야기를 찾을 수 없습니다.</h1><p>주소가 잘못되었거나 삭제된 이야기입니다.</p><Link href="/stories">목록</Link></main>;
}
