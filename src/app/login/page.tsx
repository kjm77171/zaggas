import Link from "next/link";
import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { getAuthUserId } from "@/lib/auth";
import KakaoStartButton from "@/app/auth/KakaoStartButton";
import styles from "@/app/firstExperience/firstExperience.module.css";

export default async function LoginPage() {
  if (await getAuthUserId()) redirect("/my");
  return <AppShell><main className={styles.experience}><section className={styles.content}>
    <h1 className={styles.title}>다시 만나서 반가워요.</h1>
    <KakaoStartButton label="카카오로 계속하기" />
    <p className={styles.note}>아직 계정이 없나요? <Link href="/signup">회원가입</Link></p>
  </section></main></AppShell>;
}
