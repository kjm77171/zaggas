"use client";

import Link from "next/link";
import styles from "@/app/firstExperience/firstExperience.module.css";

export default function MyError({ reset }: { reset: () => void }) {
  return <main className={styles.experience}><section className={styles.content}><h1 className={styles.title}>이야기를 불러오지 못했어요.</h1><p className={styles.description}>연결 상태를 확인하고 다시 시도해 주세요.</p><button className={styles.primary} onClick={reset}>다시 시도하기</button><p><Link href="/">첫 화면으로</Link></p></section></main>;
}
