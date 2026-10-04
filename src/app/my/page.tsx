import Link from "next/link";
import { createSupabaseSessionClient } from "@/lib/supabase/session";
import { getSupabaseAuthConfig } from "@/lib/supabase/config";
import { getProjects } from "@/lib/projects";
import { getProjectStorySummaries } from "@/lib/projectStories";
import { getCreationTypeLabel, getLastSavedAt, formatProjectDate } from "@/lib/projectPresentation";
import AppShell from "@/components/AppShell";
import KakaoStartButton from "@/app/auth/KakaoStartButton";
import styles from "./my.module.css";
export const dynamic = "force-dynamic";
export default async function MyPage() {
  if (!getSupabaseAuthConfig()) return <AppShell><main className={styles.page}><h1>My ZAGGAS</h1><p role="alert">로그인 환경설정 완료 후 사용할 수 있습니다.</p></main></AppShell>;
  const client = await createSupabaseSessionClient();
  const { data, error } = await client.auth.getClaims();
  const userId = !error ? data?.claims.sub : undefined;
  const projects = userId ? await getProjects(client, userId) : [];
  const summaries = userId ? await getProjectStorySummaries(client, userId, projects.map((project) => project.id)) : new Map();
  return <AppShell><main className={styles.page}><h1>My ZAGGAS</h1>
    {!userId ? <><p>당신의 이야기를 이어가볼까요?</p><KakaoStartButton /></> : <>
      <p className={styles.intro}>당신의 이야기를 이어갈 공간</p><Link href="/start">새 이야기 시작하기 →</Link>
      {!projects.length ? <p className={styles.empty}>아직 이야기가 없습니다. 첫 문장부터 시작해보세요.</p> : <ul className={styles.list}>{projects.map((project) => {
        const summary = summaries.get(project.id);
        const count = summary?.count ?? 0;
        const lastSavedAt = getLastSavedAt(project.updated_at, summary?.updatedAt);
        return <li key={project.id}><h2><Link href={`/projects/${project.id}`}>{project.title}</Link></h2><p className={styles.meta}>{getCreationTypeLabel(project.creation_type)}</p>
          {project.seed_sentence && <p className={styles.seed}>{project.seed_sentence}</p>}
          <p className={styles.meta}>시작 <time dateTime={project.created_at}>{formatProjectDate(project.created_at)}</time><br />마지막 저장 <time dateTime={lastSavedAt}>{formatProjectDate(lastSavedAt)}</time></p>
          <Link href={`/projects/${project.id}`}>{count === 0 ? "글쓰기 시작" : count === 1 ? "이어 쓰기" : "원고 확인 필요"} →</Link></li>;
      })}</ul>}
    </>}
  </main></AppShell>;
}
