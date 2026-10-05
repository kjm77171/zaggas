"use client";
import Link from "next/link";
import WorkspaceNavigation from "@/components/WorkspaceNavigation";
import { useEffect, useRef, useState, startTransition } from "react";
import { createManuscriptAction, createTitledManuscriptAction, renameProjectAction, saveManuscriptAction, updateCreationTypeAction } from "./actions";
import { validateContent, validateTitle, type ManuscriptLoad, type SaveState, type ProjectTitleData } from "./workspaceTypes";
import { creationTypes, type CreationType } from "@/lib/creationTypes";
import { getCreationTypeLabel, getProjectTitle } from "@/lib/projectPresentation";
import styles from "./workspace.module.css";
type FirstRequest = { storyId: string; content: string; title: string | null; expectedProjectUpdatedAt: string };
export default function WritingWorkspace({ projectId, initial, initialProject, initialCreationType, seedSentence }: {
  projectId: string; initial: ManuscriptLoad; initialProject: ProjectTitleData; initialCreationType: CreationType | null; seedSentence: string | null;
}) {
  const [originOpen, setOriginOpen] = useState(initial.kind === "empty");
  const [project, setProject] = useState(initialProject);
  const [creationType, setCreationType] = useState(initialCreationType);
  const [typeDraft, setTypeDraft] = useState(initialCreationType);
  const [typePanel, setTypePanel] = useState(false);
  const [typeState, setTypeState] = useState<"idle" | "saving" | "error" | "conflict">("idle");
  const [typeMessage, setTypeMessage] = useState("");
  const typeHeadingRef = useRef<HTMLHeadingElement>(null);
  const typeButtonRef = useRef<HTMLButtonElement>(null);
  const [titleDraft, setTitleDraft] = useState(initialProject.title ?? "");
  const [titleEditing, setTitleEditing] = useState(false);
  const [titlePanel, setTitlePanel] = useState(false);
  const [titleState, setTitleState] = useState<"idle" | "saving" | "error" | "conflict">("idle");
  const [titleMessage, setTitleMessage] = useState("");
  const [manuscript, setManuscript] = useState(initial.kind === "single" ? initial.manuscript : null);
  const [content, setContent] = useState(manuscript?.content ?? "");
  const [savedContent, setSavedContent] = useState(manuscript?.content ?? "");
  const [state, setState] = useState<SaveState>(manuscript ? "saved" : "initial");
  const [message, setMessage] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [hasRetry, setHasRetry] = useState(false);
  const requestRef = useRef<FirstRequest | null>(null);
  const inFlight = useRef(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const blocked = initial.kind === "multiple";
  const dirty = content !== savedContent;
  const titleDirty = titleDraft !== (project.title ?? "");
  const typeDirty = typeDraft !== creationType;
  const busy = state === "saving" || titleState === "saving" || typeState === "saving";
  const unsaved = dirty || titleDirty || typeDirty || busy || hasRetry;
  useEffect(() => {
    if (!unsaved) return;
    function warn(event: BeforeUnloadEvent) { event.preventDefault(); event.returnValue = ""; }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [unsaved]);
  useEffect(() => {
    if (titleEditing || titlePanel) titleRef.current?.focus();
  }, [titleEditing, titlePanel]);
  useEffect(() => { if (typePanel) typeHeadingRef.current?.focus(); }, [typePanel]);
  function cancelType() {
    setTypeDraft(creationType); setTypePanel(false); setTypeState("idle"); setTypeMessage("");
    typeButtonRef.current?.focus();
  }
  async function saveType() {
    if (inFlight.current || blocked || hasRetry || typeState === "conflict") return;
    if (!typeDirty) { cancelType(); return; }
    inFlight.current = true; setTypeState("saving"); setTypeMessage("");
    try {
      const result = await updateCreationTypeAction({ projectId, creationType: typeDraft, expectedProjectUpdatedAt: project.updatedAt });
      if (result.kind === "saved") {
        setCreationType(result.creationType); setTypeDraft(result.creationType);
        setProject(current => ({ ...current, updatedAt: result.updatedAt }));
        setTypePanel(false); setTypeState("idle"); setTypeMessage("작품 형식을 저장했습니다.");
        typeButtonRef.current?.focus();
      } else {
        setTypeMessage(result.message); setTypeState(result.kind === "conflict" ? "conflict" : "error");
      }
    } catch {
      setTypeMessage("형식 저장 결과를 확인하지 못했습니다. 선택은 그대로 두었습니다."); setTypeState("error");
    } finally { inFlight.current = false; }
  }
  async function save(confirmTitle = false) {
    if (inFlight.current || blocked || state === "conflict") return;
    const invalid = validateContent(requestRef.current?.content ?? content);
    if (invalid) { setMessage(invalid); setState("error"); editorRef.current?.focus(); return; }
    const untitled = !manuscript && project.title === null;
    if (untitled && !requestRef.current && !confirmTitle) {
      setTitlePanel(true); setMessage(""); return;
    }
    if (untitled && !requestRef.current) {
      const invalidTitle = validateTitle(titleDraft);
      if (invalidTitle) { setTitleMessage(invalidTitle); titleRef.current?.focus(); return; }
    }
    inFlight.current = true;
    setState("saving"); setMessage("");
    try {
      let result;
      if (!manuscript) {
        requestRef.current ??= { storyId: crypto.randomUUID(), content, title: untitled ? titleDraft : null, expectedProjectUpdatedAt: project.updatedAt };
        setHasRetry(true);
        const request = requestRef.current;
        result = request.title === null
          ? await createManuscriptAction({ projectId, storyId: request.storyId, content: request.content })
          : await createTitledManuscriptAction({ projectId, ...request });
      } else {
        result = await saveManuscriptAction({ projectId, storyId: manuscript.id, content, expectedUpdatedAt: manuscript.updatedAt });
      }
      if (result.kind === "saved") {
        setManuscript(result.manuscript);
        setSavedContent(result.manuscript.content);
        setState(content === result.manuscript.content ? "saved" : "dirty");
        if (result.project) {
          setProject(result.project);
          // Preserve a title edited after an uncertain first request.
          if (titleDraft === requestRef.current?.title) setTitleDraft(result.project.title ?? "");
          else setTitleEditing(true);
        }
        setTitlePanel(false); setTitleMessage(""); setTitleState("idle");
        requestRef.current = null; setHasRetry(false);
      } else {
        setMessage(result.message);
        setState(result.kind === "conflict" ? "conflict" : "error");
      }
    } catch {
      setMessage("저장 결과를 확인하지 못했습니다. 작성한 내용은 그대로 두었습니다."); setState("error");
    } finally { inFlight.current = false; }
  }
  async function renameTitle() {
    if (inFlight.current || blocked || hasRetry || titleState === "conflict") return;
    const invalid = validateTitle(titleDraft);
    if (invalid) { setTitleMessage(invalid); setTitleState("error"); titleRef.current?.focus(); return; }
    inFlight.current = true; setTitleState("saving"); setTitleMessage("");
    try {
      const result = await renameProjectAction({ projectId, title: titleDraft, expectedProjectUpdatedAt: project.updatedAt });
      if (result.kind === "saved") {
        setProject(result.project); setTitleDraft(result.project.title ?? "");
        setTitleEditing(false); setTitleState("idle"); setTitleMessage("제목을 저장했습니다.");
      } else {
        setTitleMessage(result.message); setTitleState(result.kind === "conflict" ? "conflict" : "error");
      }
    } catch {
      setTitleMessage("제목 저장 결과를 확인하지 못했습니다. 입력은 그대로 두었습니다."); setTitleState("error");
    } finally { inFlight.current = false; }
  }
  function cancelTitle() {
    setTitleDraft(project.title ?? ""); setTitleEditing(false); setTitleMessage(""); setTitleState("idle");
  }
  function reload() {
    if (!window.confirm("최신 내용을 불러오면 현재 입력한 내용이 사라집니다. 계속할까요?")) return;
    window.location.reload();
  }
  const statuses: Record<SaveState, string> = { initial: "아직 저장하지 않았습니다", dirty: "저장하지 않은 변경사항", saving: "저장 중…", saved: "저장됨", error: "저장하지 못했습니다", conflict: "저장 상태 확인이 필요합니다" };
  const titleInvalid = (titleEditing || titlePanel) ? validateTitle(titleDraft) : null;
  const titleInput = <>
    <label htmlFor="projectTitle">제목</label>
    <input ref={titleRef} id="projectTitle" value={titleDraft} readOnly={busy} aria-invalid={Boolean(titleInvalid)} aria-describedby="titleFeedback" onChange={(event) => {
      setTitleDraft(event.target.value);
      if (titleState !== "conflict") { setTitleState("idle"); setTitleMessage(""); }
    }} />
  </>;
  return <>
    <Link href="/my" className={styles.back} onClick={(event) => { if (unsaved && !window.confirm("아직 저장을 확인하지 못한 내용이 있습니다. 이동할까요?")) event.preventDefault(); }}>← My ZAGGAS</Link>
    <header className={styles.titleArea}>
      <div className={styles.projectContext}>
      <h1>{getProjectTitle(project.title)}</h1>
      <div className={styles.contextActions}>
      {!blocked && !titleEditing && !titlePanel && (project.title !== null || manuscript) && <button type="button" disabled={busy || hasRetry || typePanel} onClick={() => { setTitleEditing(true); setTitleMessage(""); }}>제목 변경</button>}
      <button ref={typeButtonRef} type="button" className={styles.typeButton} disabled={blocked || busy || hasRetry || titleEditing || titlePanel} aria-expanded={typePanel} aria-controls="creationTypePanel" onClick={() => { setTypePanel(true); setTypeMessage(""); }}>
        {creationType === null ? "작품 형식 정하기" : `${getCreationTypeLabel(creationType)} · 변경`}
      </button>
      </div>
      </div>
      {typePanel && <section id="creationTypePanel" className={styles.typePanel} aria-labelledby="creationTypeQuestion">
        <h2 id="creationTypeQuestion" ref={typeHeadingRef} tabIndex={-1}>이 이야기를 어떤 모습으로 만들어볼까요?</h2>
        <p className={styles.note}>지금 정하지 않아도 계속 쓸 수 있어요.</p>
        <form onSubmit={event => { event.preventDefault(); startTransition(async () => { await saveType(); }); }}>
          <fieldset className={styles.typeOptions} disabled={busy || hasRetry}>
            <legend className={styles.note}>마음이 가는 모습을 하나 골라주세요.</legend>
            {creationTypes.map(item => <label key={item.code} className={styles.typeOption}>
              <input type="radio" name="creationType" value={item.code} checked={typeDraft === item.code} onChange={() => { setTypeDraft(item.code); if (typeState !== "conflict") { setTypeState("idle"); setTypeMessage(""); } }} />
              <span>{item.label}<small>{item.description}</small></span>
            </label>)}
            <label className={styles.typeOption}><input type="radio" name="creationType" value="" checked={typeDraft === null} onChange={() => { setTypeDraft(null); if (typeState !== "conflict") { setTypeState("idle"); setTypeMessage(""); } }} /><span>아직 모르겠어요<small>쓰면서 천천히 정해도 괜찮아요</small></span></label>
          </fieldset>
          <div className={styles.recovery}><button type="submit" disabled={busy || hasRetry || typeState === "conflict"}>이대로 정하기</button><button type="button" disabled={busy} onClick={cancelType}>취소</button></div>
        </form>
      </section>}
      <p role="status" aria-live="polite" className={styles.note}>{typeState === "saving" ? "형식을 저장하고 있어요…" : typeMessage}</p>
      {(typeState === "conflict" || typeState === "error") && <button type="button" disabled={busy} onClick={reload}>최신 정보 다시 불러오기</button>}
      {titleEditing && !titlePanel && <form className={styles.titleForm} onSubmit={(event) => { event.preventDefault(); void renameTitle(); }}>
        {titleInput}
        <div className={styles.recovery}><button type="submit" disabled={busy || hasRetry || !titleDirty || titleState === "conflict"}>제목 저장</button><button type="button" disabled={busy} onClick={cancelTitle}>취소</button></div>
      </form>}
    </header>
    <WorkspaceNavigation projectId={projectId} active="manuscript" onNavigate={event => { if (unsaved && !window.confirm("아직 저장을 확인하지 못한 내용이 있습니다. 이동할까요?")) event.preventDefault(); }} />
    {seedSentence?.trim() && <section className={styles.origin}>
      <button type="button" className={styles.originToggle} aria-expanded={originOpen} aria-controls="storyOrigin" onClick={() => setOriginOpen(open => !open)}>
        <span>이야기의 출발점</span><span>{originOpen ? "접기" : "펼치기"}</span>
      </button>
      <p id="storyOrigin" hidden={!originOpen}>{seedSentence}</p>
    </section>}
    {blocked && <p role="alert">이 작업에 여러 원고가 연결되어 있어 확인이 필요합니다. 원고를 임의로 선택하지 않았습니다.</p>}
    <form onSubmit={(event) => { event.preventDefault(); void save(); }} className={styles.editorForm}>
      <label htmlFor="manuscript">원고</label>
      <textarea ref={editorRef} id="manuscript" value={content} disabled={blocked} readOnly={busy} rows={18} aria-invalid={Boolean(message)} aria-describedby={`workspaceNote${message ? " workspaceError" : ""}`} onChange={(event) => {
        setContent(event.target.value);
        if (state !== "conflict") { setState(event.target.value === savedContent ? (manuscript ? "saved" : "initial") : "dirty"); setMessage(""); }
      }} />
      <div className={styles.saveRow}><span role="status" aria-live="polite">{statuses[state]}</span><button type="submit" disabled={blocked || busy || state === "conflict" || titlePanel || (Boolean(manuscript) && !dirty)}>{hasRetry ? "같은 요청 다시 시도" : "저장"}</button></div>
      <p id="workspaceNote" className={styles.note}>이동하기 전에 저장해 주세요.</p>
      {hasRetry && state !== "saving" && <p className={styles.note}>재시도는 최초 요청한 제목과 원고를 먼저 확인합니다. 이후 변경한 내용은 별도로 저장해 주세요.</p>}
      {message && <p id="workspaceError" role="alert">{message}</p>}
      {(state === "conflict" || state === "error") && <div className={styles.recovery}>
        <button type="button" disabled={busy} onClick={reload}>최신 내용 다시 불러오기</button>
        <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(content); setCopyMessage("작성한 내용을 복사했습니다."); } catch { editorRef.current?.focus(); editorRef.current?.select(); setCopyMessage("원고를 선택했습니다. 직접 복사해 주세요."); } }}>내 내용 복사</button>
        <span role="status">{copyMessage}</span>
      </div>}
    </form>
    {titlePanel && <section className={styles.titlePanel} aria-labelledby="titleDecision">
      <h2 id="titleDecision">이 이야기에 제목을 붙여볼까요?</h2><p className={styles.note}>제목은 나중에 언제든 바꿀 수 있어요.</p>
      <form className={styles.titleForm} onSubmit={(event) => { event.preventDefault(); void save(true); }}>
        {titleInput}
        <div className={styles.recovery}><button type="submit" disabled={busy || state === "conflict"}>이 제목으로 저장</button><button type="button" disabled={busy} onClick={() => { setTitlePanel(false); editorRef.current?.focus(); }}>계속 쓰기</button></div>
      </form>
    </section>}
    <p id="titleFeedback" role="status" aria-live="polite" className={styles.note}>{titleMessage || titleInvalid || (titleDirty ? "저장하지 않은 제목" : "")}</p>
    {(titleState === "conflict" || titleState === "error") && <button type="button" disabled={busy} onClick={reload}>최신 정보 다시 불러오기</button>}
  </>;
}
