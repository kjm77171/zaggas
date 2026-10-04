"use client";

import Link from "next/link";

export default function StoriesError({ reset }: { reset: () => void }) {
  return <main className="storyPage"><h1>이야기를 불러오지 못했습니다.</h1><p role="alert">서버 연결 또는 설정에 문제가 있습니다. 잠시 후 다시 시도해 주세요.</p><div className="actions"><button onClick={reset}>다시 시도</button><Link href="/">ZAGGAS</Link></div></main>;
}
