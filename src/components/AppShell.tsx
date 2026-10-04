import type { ReactNode } from "react";
import GlobalHeader from "./GlobalHeader";
import styles from "./navigation.module.css";

export default function AppShell({ children }: { children: ReactNode }) {
  return <div className={styles.shell}><GlobalHeader />{children}</div>;
}
