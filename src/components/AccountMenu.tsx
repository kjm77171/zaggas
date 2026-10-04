"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { signOut } from "@/app/auth/actions";
import styles from "./navigation.module.css";

export default function AccountMenu() {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    function closeOutside(event: PointerEvent) {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open]);
  return <div ref={rootRef} className={styles.account} onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }} onKeyDown={(event) => {
    if (event.key === "Escape" && open) { setOpen(false); triggerRef.current?.focus(); }
  }}>
    <button ref={triggerRef} type="button" className={styles.menuButton} aria-expanded={open} aria-controls={menuId} onClick={() => setOpen(!open)}>Menu</button>
    <div id={menuId} className={styles.menu} hidden={!open}>
      <Link href="/my" onClick={() => setOpen(false)}>My ZAGGAS</Link>
      <Link href="/start" onClick={() => setOpen(false)}>새 이야기 시작하기</Link>
      <form action={signOut}><button className={styles.menuButton} type="submit">로그아웃</button></form>
    </div>
  </div>;
}
