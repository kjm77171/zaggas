import Link from "next/link";
import { createSupabaseSessionClient } from "@/lib/supabase/session";
import { getSupabaseAuthConfig } from "@/lib/supabase/config";
import { getProjects } from "@/lib/projects";
import AppShell from "@/components/AppShell";
import KakaoStartButton from "@/app/auth/KakaoStartButton";
import styles from "@/app/firstExperience/firstExperience.module.css";

export const dynamic = "force-dynamic";

export default async function MyPage() {
  if (!getSupabaseAuthConfig()) return <AppShell><main className={styles.experience}><section className={styles.content}><h1 className={styles.title}>이야기를 이어갈 공간</h1><p role="alert">로그인 환경설정 완료 후 사용할 수 있습니다.</p><Link href="/">첫 화면으로</Link></section></main></AppShell>;
  const supabase = await createSupabaseSessionClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = !error ? data?.claims.sub : undefined;
  const projects = userId ? await getProjects(supabase, userId) : [];
  return <AppShell><main className={styles.experience}>
    <section className={styles.content}>
      <h1 className={styles.title}>{userId && projects.length ? <>당신의 첫 이야기가<br />시작되었습니다.</> : <>당신의 이야기를<br />이어가볼까요?</>}</h1>
      {!userId ? <><p className={styles.description}>카카오로 시작하면 작성한 이야기를 이어갈 수 있어요.</p><KakaoStartButton /></>
        : !projects.length ? <><p className={styles.description}>아직 Project가 없습니다. 첫 문장부터 시작해보세요.</p><Link href="/start">첫 문장 시작하기 →</Link></>
        : <ul className={styles.projectList}>{projects.map((project) => <li key={project.id}><h2>{project.title}</h2>{project.seed_sentence && <p className={styles.sentence}>{project.seed_sentence}</p>}</li>)}</ul>}
    </section>
  </main></AppShell>;
}
