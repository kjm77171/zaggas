import Link from "next/link";
import PrimaryTextCta from "@/components/PrimaryTextCta";
import { createSupabaseSessionClient } from "@/lib/supabase/session";
import { getSupabaseAuthConfig } from "@/lib/supabase/config";
import { getProjects, type Project } from "@/lib/projects";
import { getUnitSummaries } from "@/lib/manuscriptUnits";
import { getFocusPath } from "@/lib/manuscriptTypes";
import { getCreationTypeLabel, getProjectTitle, getContinuationProjects, formatProjectDate } from "@/lib/projectPresentation";
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
  const summaries = userId ? await getUnitSummaries(client, projects.map((project) => project.id)) : new Map<string, { count: number; ids: string[] }>();
  const { hero, others } = getContinuationProjects(projects);
  function projectDetails(project: Project, primary = false) {
    const summary = summaries.get(project.id);
    const saved = (summary?.count ?? 0) > 0;
    const destination = project.last_written_unit_id && summary?.ids.includes(project.last_written_unit_id) ? getFocusPath(project.id, project.last_written_unit_id) : `/projects/${project.id}`;
    const date = project.last_writing_at ?? project.created_at;
    return <>
      <p className={styles.meta}>{getCreationTypeLabel(project.creation_type)}</p>
      {project.seed_sentence && <p className={styles.seed}>{project.seed_sentence}</p>}
      <p className={styles.meta}>{project.last_writing_at ? "원고 작성" : "시작"} <time dateTime={date}>{formatProjectDate(date)}</time></p>
      <>{primary ? <PrimaryTextCta href={destination}>{saved ? "이어 쓰기" : "글쓰기 시작"}</PrimaryTextCta> : <Link href={destination} className="zSecondaryLink">{saved ? "이어 쓰기" : "글쓰기 시작"} →</Link>}</>
    </>;
  }
  return <AppShell><main className={styles.page}><h1>My ZAGGAS</h1>
    {!userId ? <><p>당신의 이야기를 이어가볼까요?</p><KakaoStartButton /></> : <>
      <p className={styles.intro}>당신의 이야기를 이어가세요.</p>
      {!projects.length ? <div className={styles.empty}><p>아직 이야기가 없습니다. 첫 문장부터 시작해보세요.</p><Link href="/start" className={styles.continueLink}>새 이야기 시작하기 →</Link></div> : <>
        {hero && <section className={styles.hero} aria-labelledby="continueTitle">
          <p className={styles.eyebrow}>{hero.last_writing_at !== null ? "최근 저장한 이야기" : "시작한 이야기"}</p>
          <h2 id="continueTitle"><Link href={`/projects/${hero.id}`}>{getProjectTitle(hero.title)}</Link></h2>
          {projectDetails(hero, true)}
        </section>}
        {others.length > 0 && <section aria-labelledby="otherStories"><h2 id="otherStories" className={styles.sectionTitle}>다른 이야기</h2><ul className={styles.list}>{others.map(project => <li key={project.id}>
          <h3><Link href={`/projects/${project.id}`}>{getProjectTitle(project.title)}</Link></h3>{projectDetails(project)}
        </li>)}</ul></section>}
        <footer className={styles.newStory}><Link href="/start">새 이야기 시작하기 →</Link></footer>
      </>}
    </>}
  </main></AppShell>;
}
