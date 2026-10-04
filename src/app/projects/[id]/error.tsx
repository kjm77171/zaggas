"use client";
import Link from "next/link";
export default function WorkspaceError({ reset }: { reset: () => void }) { return <main className="storyPage"><h1>작업을 불러오지 못했습니다.</h1><p>연결 상태를 확인하고 다시 시도해 주세요.</p><button onClick={reset}>다시 시도</button><p><Link href="/my">My ZAGGAS</Link></p></main>; }
