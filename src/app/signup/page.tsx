import Link from "next/link";
import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { getAuthUserId } from "@/lib/auth";
import KakaoStartButton from "@/app/auth/KakaoStartButton";
import styles from "@/app/firstExperience/firstExperience.module.css";

export default async function SignupPage() {
  if (await getAuthUserId()) redirect("/my");
  return <AppShell><main className={styles.experience}><section className={styles.content}>
    <h1 className={styles.title}>당신의 이야기를 시작해보세요.</h1>
    <KakaoStartButton label="카카오로 시작하기" />
    <p className={styles.note}>이미 계정이 있나요? <Link href="/login">로그인</Link></p>
  </section></main></AppShell>;
}
