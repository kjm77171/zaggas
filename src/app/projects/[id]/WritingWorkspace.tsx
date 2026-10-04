"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createManuscriptAction, saveManuscriptAction } from "./actions";
import { validateContent, type ManuscriptLoad, type SaveState } from "./workspaceTypes";
import styles from "./workspace.module.css";
export default function WritingWorkspace({ projectId, initial, children }: { projectId: string; initial: ManuscriptLoad; children: ReactNode }) {
  const [manuscript, setManuscript] = useState(initial.kind === "single" ? initial.manuscript : null);
  const [content, setContent] = useState(manuscript?.content ?? "");
  const [savedContent, setSavedContent] = useState(manuscript?.content ?? "");
  const [state, setState] = useState<SaveState>(manuscript ? "saved" : "initial");
  const [message, setMessage] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [hasRetry, setHasRetry] = useState(false);
  const requestRef = useRef<{ storyId: string; content: string } | null>(null);
  const inFlight = useRef(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const blocked = initial.kind === "multiple";
  const dirty = content !== savedContent;
  const unsaved = dirty || state === "saving" || hasRetry;
  useEffect(() => {
    if (!unsaved) return;
    function warn(event: BeforeUnloadEvent) { event.preventDefault(); event.returnValue = ""; }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [unsaved]);
  async function save() {
    if (inFlight.current || blocked || state === "conflict") return;
    const invalid = validateContent(requestRef.current?.content ?? content);
    if (invalid) { setMessage(invalid); setState("error"); editorRef.current?.focus(); return; }
    inFlight.current = true;
    setState("saving"); setMessage("");
    try {
      let result;
      if (!manuscript) {
        requestRef.current ??= { storyId: crypto.randomUUID(), content };
        setHasRetry(true);
        const request = requestRef.current;
        result = await createManuscriptAction({ projectId, storyId: request.storyId, content: request.content });
      } else {
        result = await saveManuscriptAction({ projectId, storyId: manuscript.id, content, expectedUpdatedAt: manuscript.updatedAt });
      }
      if (result.kind === "saved") {
        setManuscript(result.manuscript);
        setSavedContent(result.manuscript.content);
        // Keep any edits made after an uncertain initial request. They need a separate UPDATE.
        setState(content === result.manuscript.content ? "saved" : "dirty");
        requestRef.current = null;
        setHasRetry(false);
      } else {
        setMessage(result.message);
        setState(result.kind === "conflict" ? "conflict" : "error");
      }
    } catch {
      setMessage("저장 결과를 확인하지 못했습니다. 작성한 내용은 그대로 두었습니다."); setState("error");
    } finally { inFlight.current = false; }
  }
  function reload() {
    if (!window.confirm("최신 내용을 불러오면 현재 입력한 내용이 사라집니다. 계속할까요?")) return;
    // Full reload intentionally replaces editor state only after confirmation.
    window.location.reload();
  }
  const statuses: Record<SaveState, string> = { initial: "아직 저장하지 않았습니다", dirty: "저장하지 않은 변경사항", saving: "저장 중…", saved: "저장됨", error: "저장하지 못했습니다", conflict: "저장 상태 확인이 필요합니다" };
  return <>
    <Link href="/my" className={styles.back} onClick={(event) => { if (unsaved && !window.confirm("아직 저장을 확인하지 못한 내용이 있습니다. 이동할까요?")) event.preventDefault(); }}>← My ZAGGAS</Link>
    {children}
    {blocked && <p role="alert">이 작업에 여러 원고가 연결되어 있어 확인이 필요합니다. 원고를 임의로 선택하지 않았습니다.</p>}
    <form onSubmit={(event) => { event.preventDefault(); void save(); }} className={styles.editorForm}>
      <label htmlFor="manuscript">원고</label>
      <textarea ref={editorRef} id="manuscript" value={content} disabled={blocked} readOnly={state === "saving"} rows={18} aria-invalid={Boolean(message)} aria-describedby={`workspaceNote${message ? " workspaceError" : ""}`} onChange={(event) => {
        setContent(event.target.value);
        if (state !== "conflict") { setState(event.target.value === savedContent ? (manuscript ? "saved" : "initial") : "dirty"); setMessage(""); }
      }} />
      <div className={styles.saveRow}><span role="status" aria-live="polite">{statuses[state]}</span><button type="submit" disabled={blocked || state === "saving" || state === "conflict" || (Boolean(manuscript) && !dirty)}>저장</button></div>
      <p id="workspaceNote" className={styles.note}>이동하기 전에 저장해 주세요.</p>
      {hasRetry && state !== "saving" && <p className={styles.note}>재시도는 최초 요청한 원고를 먼저 확인합니다. 이후 변경한 내용은 별도로 저장해 주세요.</p>}
      {message && <p id="workspaceError" role="alert">{message}</p>}
      {(state === "conflict" || state === "error") && <div className={styles.recovery}>
        <button type="button" onClick={reload}>최신 내용 다시 불러오기</button>
        <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(content); setCopyMessage("작성한 내용을 복사했습니다."); } catch { editorRef.current?.focus(); editorRef.current?.select(); setCopyMessage("원고를 선택했습니다. 직접 복사해 주세요."); } }}>내 내용 복사</button>
        <span role="status">{copyMessage}</span>
      </div>}
    </form>
  </>;
}
