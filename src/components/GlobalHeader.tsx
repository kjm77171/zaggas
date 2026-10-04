import Link from "next/link";
import { getAuthUserId } from "@/lib/auth";
import AccountMenu from "./AccountMenu";
import styles from "./navigation.module.css";

export default async function GlobalHeader() {
  const userId = await getAuthUserId();
  return <header className={styles.header}>
    <Link className={styles.brand} href="/">ZAGGAS</Link>
    <nav className={styles.navigation} aria-label="주 메뉴">
      {userId ? <><Link href="/my">My ZAGGAS</Link><AccountMenu /></>
        : <><Link href="/start">시작하기</Link><Link href="/login">로그인</Link></>}
    </nav>
  </header>;
}
