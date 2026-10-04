import Link from "next/link";
import AppShell from "@/components/AppShell";
import { createSupabaseSessionClient } from "@/lib/supabase/session";
import { getSupabaseAuthConfig } from "@/lib/supabase/config";
import Handoff from "./Handoff";
import KakaoStartButton from "../KakaoStartButton";
import styles from "@/app/firstExperience/firstExperience.module.css";

export const dynamic = "force-dynamic";

export default async function AuthCompletePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  let authenticated = false;
  let profileError = false;
  const configured = Boolean(getSupabaseAuthConfig());
  if (configured) {
    try {
      const supabase = await createSupabaseSessionClient();
      const { data, error } = await supabase.auth.getClaims();
      if (!error && data?.claims.sub) {
        authenticated = true;

      }
    } catch {
      profileError = true;
    }
  }
  return <AppShell><main className={styles.experience}>
    <section className={styles.content}>
      <h1 className={styles.title}>당신의 이야기를<br />이어갈게요.</h1>
      {!configured ? <p role="alert">로그인 환경설정이 필요합니다. 설정 완료 후 다시 시도해 주세요.</p>
        : profileError ? <><p role="alert">로그인 정보를 확인하지 못했습니다. 입력은 그대로 보관되어 있습니다.</p><Link href="/auth/complete">다시 확인하기</Link></>
        : authenticated ? <Handoff />
        : <><p className={styles.description}>{params.error ? "로그인을 완료하지 못했습니다. 작성한 문장은 이 탭에 남아 있어요." : "이야기를 이어가려면 카카오로 시작해 주세요."}</p><KakaoStartButton /></>}
      <p className={styles.note}><Link href="/start">내 문장으로 돌아가기</Link></p>
    </section>
  </main></AppShell>;
}
