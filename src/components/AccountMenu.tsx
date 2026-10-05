"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { signOut } from "@/app/auth/actions";
import { logoutWithDrafts } from "@/lib/proseLogout";
import styles from "./navigation.module.css";

export default function AccountMenu({ userId }: { userId: string }) {
  const [logoutMessage, setLogoutMessage] = useState("");
  const [logoutWarning, setLogoutWarning] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const logoutLock = useRef(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  async function logout(confirmed = false) {
    if (logoutLock.current) return;
    logoutLock.current = true; setLogoutBusy(true); setLogoutMessage("");
    try {
      if (await logoutWithDrafts(userId, confirmed, signOut) === "confirmation_required") {
        setLogoutWarning(true); setOpen(true); return;
      }

    } catch { setLogoutMessage("기기 백업 삭제를 확인하지 못했습니다. 다시 시도해 주세요."); return; }
    finally { logoutLock.current = false; setLogoutBusy(false); }
  }
  useEffect(() => { if (logoutWarning) cancelRef.current?.focus(); }, [logoutWarning]);
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
      <button className={styles.menuButton} type="button" disabled={logoutBusy} onClick={() => { void logout(); }}>로그아웃</button>
      {logoutWarning && <section aria-label="로그아웃 전 원고 확인">
        <p>아직 서버에 저장되지 않은 글이 있습니다. 로그아웃하면 이 기기에 남아 있는 임시 원고도 삭제됩니다.</p>
        <button ref={cancelRef} className="zSecondaryAction" type="button" onClick={() => { setLogoutWarning(false); setOpen(false); triggerRef.current?.focus(); }}>돌아가서 확인</button>
        <button className="zSecondaryAction" type="button" disabled={logoutBusy} onClick={() => { void logout(true); }}>로그아웃하고 삭제</button>
        <p className="zHelper">공용 기기에서는 사용 후 로그아웃해 주세요. 로그아웃하면 이 기기의 임시 원고가 삭제됩니다.</p>
      </section>}
      {logoutMessage && <p role="status">{logoutMessage}</p>}
    </div>
  </div>;
}
