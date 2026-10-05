import PrimaryTextCta from "@/components/PrimaryTextCta";
import AppShell from "@/components/AppShell";
import styles from "./home.module.css";

export default function Home() {
  return <AppShell><main className={styles.home}>
    <section className={styles.content} aria-labelledby="homeTitle">
      <h1 id="homeTitle" className={styles.title}>당신 안의 이야기를,<br />가능하게.</h1>
      <p className={styles.description}>작은 생각을 발견하고,<br />이야기로 이어갈 공간.</p>
      <PrimaryTextCta href="/start">시작하기</PrimaryTextCta>
      <p className={styles.philosophy}>Be real. Be human.<br />Simple outside. Deep inside.</p>
      <p className={styles.direction}>CREATE · CONNECT · MAKE IT POSSIBLE · GROW</p>
    </section>
  </main></AppShell>;
}
