"use client";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useReducer, useRef, useState } from "react";
import { ProseAutosave, normalizeProse, type ProseBackup } from "@/lib/proseAutosave";
import { readProseBackups, writeProseBackup, discardProseBackup } from "@/lib/proseBackup";
import { saveProseAction, readProseAction } from "./actions";
import { registerProseEditor } from "@/lib/proseSession";
import styles from "./focus.module.css";
export default function ProseEditor({ userId, projectId, unitId, content, revision }: { userId: string; projectId: string; unitId: string; content: string | null; revision: number }) {
  const router = useRouter();
  const [, render] = useReducer(value => value + 1, 0);
  const [engine, setEngine] = useState<ProseAutosave | null>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const [recovery, setRecovery] = useState<ProseBackup | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const engine = new ProseAutosave({ userId, projectId, unitId, backupId: crypto.randomUUID() }, { content, revision }, snapshot => new Promise((resolve, reject) => { startTransition(async () => { try { resolve(await saveProseAction(snapshot)); } catch (error) { reject(error); } }); }), writeProseBackup, render);
    let alive = true;
    const unregister = registerProseEditor(userId, engine, () => { setLoggingOut(true); setNotice("로그아웃을 위해 이 기기의 임시 원고를 정리합니다."); });
    void readProseBackups(userId, projectId, unitId).then(rows => {
      if (!alive) return;
      const candidate = rows.find(row => row.pending || (normalizeProse(row.content) !== row.confirmedContent && normalizeProse(row.content) !== content));
      if (candidate) setRecovery(candidate); else engine.activate();
      setEngine(engine); setReady(true);
    }, () => { if (alive) { engine.backupFailed = true; engine.activate(); setEngine(engine); setReady(true); } });
    function warn(event: BeforeUnloadEvent) { if (engine.unconfirmed) { event.preventDefault(); event.returnValue = ""; } }
    function guard(event: MouseEvent) {
      if (event.defaultPrevented || !(event.target instanceof Element)) return;
      const link = event.target.closest("a[href]"); if (!link || !engine.unconfirmed) return;
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault(); event.stopPropagation();
      if (!window.confirm("서버에서 저장을 확인하지 못한 글이 있습니다. 이동할까요?")) return;
      void engine.backup().then(() => {
        if (engine.backupFailed) { setNotice("기기 백업을 확인하지 못해 이동을 멈췄습니다. 서버 저장을 확인해 주세요."); return; }
        const url = new URL((link as HTMLAnchorElement).href);
        if (url.origin === window.location.origin) router.push(url.pathname + url.search + url.hash);
      });
    }
    window.addEventListener("beforeunload", warn); document.addEventListener("click", guard, true);
    return () => { alive = false; unregister(); engine.dispose(); window.removeEventListener("beforeunload", warn); document.removeEventListener("click", guard, true); };
    // The keyed Unit boundary owns initial server state; route refresh never replaces a local draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, projectId, unitId, router]);
  async function restore(backup: ProseBackup) {
    if (!engine) return;
    engine.activate(backup); setRecovery(null);
    await engine.backup();
    if (!engine.backupFailed) await discardProseBackup(backup).catch(() => setNotice("이전 백업 정리를 확인하지 못했습니다."));
  }
  async function chooseServer(backup: ProseBackup) {
    if (!engine || backup.pending || !window.confirm("이 기기의 글 대신 서버에 저장된 글을 사용할까요?")) return;
    await engine.useServer({ content, revision }); setRecovery(null);
    if (!engine.backupFailed) await discardProseBackup(backup).catch(() => setNotice("이전 백업 정리를 확인하지 못했습니다."));
  }
  async function latest() {
    if (!engine || engine.inFlight || engine.pending) return;
    if (!window.confirm("입력한 글 대신 최신 저장본을 불러올까요?")) return;
    const current = await readProseAction(projectId, unitId);
    if (!current) { setNotice("최신 저장본을 확인하지 못했습니다. 입력은 그대로 유지됩니다."); return; }
    await engine.useServer(current); setNotice("");
  }
  return <section className={styles.editor} aria-label="원고 쓰기">
    {recovery && <div className={styles.recovery} role="status"><p>이 기기에 저장되지 않은 글이 남아 있어요.</p>
      <button className="zSecondaryAction" onClick={() => { void restore(recovery); }}>복구해서 계속 쓰기</button>
      <button className="zSecondaryAction" disabled={Boolean(recovery.pending)} onClick={() => { void chooseServer(recovery); }}>서버에 저장된 글 사용</button>
      {recovery.pending && <p className="zHelper">이전 저장 결과를 먼저 같은 요청으로 확인해 주세요.</p>}
    </div>}
    <textarea ref={textarea} className={styles.writing} aria-label="원고 본문" placeholder="떠오르는 이야기를 써보세요." value={engine?.draft ?? content ?? ""} readOnly={!ready || Boolean(recovery) || loggingOut} onChange={event => engine?.input(event.target.value)} onCompositionStart={() => engine?.composition(true)} onCompositionEnd={event => { engine?.input(event.currentTarget.value); engine?.composition(false); }} onKeyDown={event => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") { event.preventDefault(); void engine?.flush(); } }} />
    <div className={styles.status} role="status" aria-live="polite">
      {engine?.phase === "SAVING" && "저장 중…"}
      {engine?.phase === "ERROR" && "저장되지 않음"}
      {engine?.phase === "RESULT_UNKNOWN" && "저장 결과 확인 필요"}
      {engine?.phase === "CONFLICT" && "변경 충돌"}
      {engine?.message && <p>{engine.message}</p>}
      {(engine?.phase === "ERROR" || engine?.phase === "RESULT_UNKNOWN") && <button className="zSecondaryAction" onClick={() => { void engine.flush(); }}>같은 저장 요청 다시 확인</button>}
      {engine?.phase === "CONFLICT" && <><button className="zSecondaryAction" onClick={() => { void latest(); }}>최신 저장본 불러오기</button><button className="zSecondaryAction" onClick={() => { void engine.backup(); setNotice("내 글을 이 기기에 보관합니다. 서버 원고는 덮어쓰지 않습니다."); }}>내 글 계속 보관</button></>}
      {engine?.backupFailed && <p>이 기기의 백업을 사용할 수 없습니다. 서버 저장을 확인하기 전에는 화면을 닫지 마세요.</p>}
      {notice && <p>{notice}</p>}
    </div>
    {(recovery || engine?.backupFailed || engine?.phase === "ERROR" || engine?.phase === "RESULT_UNKNOWN" || engine?.phase === "CONFLICT") && <p className={`zHelper ${styles.privacy}`}>공용 기기에서는 사용 후 로그아웃해 주세요. 로그아웃하면 이 기기의 임시 원고가 삭제됩니다.</p>}
  </section>;
}
