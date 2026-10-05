"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, startTransition } from "react";
import PrimaryTextCta from "@/components/PrimaryTextCta";
import { creationTypes, type CreationType } from "@/lib/creationTypes";
import { getCreationTypeLabel, getProjectTitle } from "@/lib/projectPresentation";
import { getUnitLabel, getUnitNumber, getFocusPath, type ManuscriptUnit, type UnitCreateRequest } from "@/lib/manuscriptTypes";
import type { Project } from "@/lib/projects";
import { createUnitAction, reloadProjectContextAction, renameProjectAction, updateCreationTypeAction } from "./actions";
import styles from "./workspace.module.css";
export default function WritingWorkspace({ project: initialProject, units }: { project: Project; units: ManuscriptUnit[] }) {
  const router = useRouter();
  const [project, setProject] = useState(initialProject);
  const [panel, setPanel] = useState<"title" | "type" | null>(null);
  const [titleDraft, setTitleDraft] = useState(project.title ?? "");
  const [typeDraft, setTypeDraft] = useState<CreationType | null>(project.creation_type);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "error" | "conflict" | "unknown">("idle");
  const [originOpen, setOriginOpen] = useState(units.length === 0);
  const inFlight = useRef(false);
  const pending = useRef<UnitCreateRequest | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const dirty = panel === "title" ? titleDraft !== (project.title ?? "") : panel === "type" ? typeDraft !== project.creation_type : false;
  const unsaved = dirty || busy || state === "unknown";
  const unitLabel = getUnitLabel(project.creation_type);
  const lastUnit = units.find(unit => unit.id === project.last_written_unit_id);
  const continuationUnit = lastUnit ?? units[0];
  useEffect(() => {
    if (!unsaved) return;
    function warn(event: BeforeUnloadEvent) { event.preventDefault(); event.returnValue = ""; }
    function navigate(event: MouseEvent) {
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (anchor && !window.confirm("아직 저장을 확인하지 못한 내용이 있습니다. 이동할까요?")) { event.preventDefault(); event.stopPropagation(); }
    }
    window.addEventListener("beforeunload", warn); document.addEventListener("click", navigate, true);
    return () => { window.removeEventListener("beforeunload", warn); document.removeEventListener("click", navigate, true); };
  }, [unsaved]);
  useEffect(() => { if (panel) panelRef.current?.querySelector<HTMLInputElement>("input")?.focus(); }, [panel]);
  function openPanel(next: "title" | "type") { setPanel(next); setTitleDraft(project.title ?? ""); setTypeDraft(project.creation_type); setState("idle"); setMessage(""); }
  function cancelPanel() { setPanel(null); setTitleDraft(project.title ?? ""); setTypeDraft(project.creation_type); setState("idle"); setMessage(""); }
  async function saveMetadata() {
    if (inFlight.current || state === "conflict" || pending.current || !panel) return;
    if (!dirty) { cancelPanel(); return; }
    inFlight.current = true; setBusy(true); setMessage("");
    try {
      if (panel === "title") {
        const result = await renameProjectAction({ projectId: project.id, title: titleDraft, expectedProjectUpdatedAt: project.updated_at });
        if (result.kind === "saved") { setProject(current => ({ ...current, title: result.project.title, updated_at: result.project.updatedAt })); setPanel(null); setState("idle"); setMessage("제목을 저장했습니다."); }
        else { setMessage(result.message); setState(result.kind === "conflict" ? "conflict" : "error"); }
      } else {
        const result = await updateCreationTypeAction({ projectId: project.id, creationType: typeDraft, expectedProjectUpdatedAt: project.updated_at });
        if (result.kind === "saved") { setProject(current => ({ ...current, creation_type: result.creationType, updated_at: result.updatedAt })); setPanel(null); setState("idle"); setMessage("작품 형식을 저장했습니다."); }
        else { setMessage(result.message); setState(result.kind === "conflict" ? "conflict" : "error"); }
      }
    } catch { setMessage("저장 결과를 확인하지 못했습니다. 입력은 그대로 두었습니다."); setState("error"); }
    finally { inFlight.current = false; setBusy(false); }
  }
  async function reload() {
    if (inFlight.current || pending.current) return;
    if (dirty && !window.confirm("입력한 내용을 최신 정보로 바꿀까요?")) return;
    inFlight.current = true; setBusy(true);
    try {
      const latest = await reloadProjectContextAction(project.id);
      if (!latest) { setMessage("최신 정보를 불러오지 못했습니다."); return; }
      setProject(latest); setTitleDraft(latest.title ?? ""); setTypeDraft(latest.creation_type); setPanel(null); setState("idle"); setMessage(""); router.refresh();
    } catch { setMessage("최신 정보를 불러오지 못했습니다. 입력은 그대로 두었습니다."); }
    finally { inFlight.current = false; setBusy(false); }
  }
  async function createUnit() {
    if (inFlight.current || dirty || panel || state === "conflict") return;
    inFlight.current = true; setBusy(true); setMessage("");
    try {
      pending.current ??= { projectId: project.id, unitId: crypto.randomUUID(), requestId: crypto.randomUUID(), expectedStructureRevision: project.manuscript_structure_revision };
      const result = await createUnitAction(pending.current);
      if (result.kind === "created" || result.kind === "existing_retry") {
        pending.current = null; setState("idle"); router.push(getFocusPath(project.id, result.unitId));
      } else {
        setMessage(result.message);
        if (result.kind === "conflict") {
          pending.current = null; setState("conflict");
          try {
            const latest = await reloadProjectContextAction(project.id);
            if (latest) { setProject(latest); router.refresh(); }
          } catch { /* 충돌 상태를 유지하고 사용자가 다시 조회하도록 한다. */ }
        }
        else if (result.kind === "unknown") setState("unknown");
        else { pending.current = null; setState("error"); }
      }
    } catch { setMessage("생성 결과를 확인하지 못했습니다. 같은 요청으로 다시 확인해 주세요."); setState(pending.current ? "unknown" : "error"); }
    finally { inFlight.current = false; setBusy(false); }
  }
  const createText = state === "unknown" ? "같은 생성 요청 다시 확인" : units.length ? `+ 새 ${unitLabel}` : `첫 ${unitLabel} 쓰기`;
  return <>
    <Link href="/my" className="zBackLink">← My ZAGGAS</Link>
    <header className={styles.titleArea}><h1>{getProjectTitle(project.title)}</h1><div className={styles.contextActions}>
      <button type="button" className="zQuietAction" disabled={busy || state === "unknown" || panel !== null} onClick={() => openPanel("title")}>{project.title === null ? "제목 정하기" : "제목 변경"}</button>
      <button type="button" className="zQuietAction" disabled={busy || state === "unknown" || panel !== null} onClick={() => openPanel("type")}>{project.creation_type === null ? "작품 형식 정하기" : `${getCreationTypeLabel(project.creation_type)} · 변경`}</button>
    </div></header>
    {panel && <div ref={panelRef}><form className={styles.titleForm} onSubmit={event => { event.preventDefault(); startTransition(saveMetadata); }}>
      {panel === "title" ? <><label htmlFor="projectTitle" className="zFieldLabel">작품 제목</label><input id="projectTitle" className="zInput" value={titleDraft} disabled={busy} onChange={event => setTitleDraft(event.target.value)} /></> : <fieldset className={styles.typeOptions} disabled={busy}><legend>이 이야기를 어떤 모습으로 만들어볼까요?</legend>
        {creationTypes.map(item => <label key={item.code} className={styles.typeOption}><input type="radio" name="creationType" checked={typeDraft === item.code} onChange={() => setTypeDraft(item.code)} /><span>{item.label}<small>{item.description}</small></span></label>)}
        <label className={styles.typeOption}><input type="radio" name="creationType" checked={typeDraft === null} onChange={() => setTypeDraft(null)} /><span>아직 모르겠어요</span></label>
      </fieldset>}
      <div className={styles.recovery}><button type="submit" disabled={busy || state === "conflict"}>저장</button><button type="button" disabled={busy} onClick={cancelPanel}>취소</button></div>
    </form></div>}
    <p role="status" aria-live="polite" className="zHelper">{busy ? "확인하고 있어요…" : message}</p>
    {(state === "conflict" || state === "error") && <button type="button" className="zQuietAction" disabled={busy} onClick={() => startTransition(reload)}>최신 정보 다시 불러오기</button>}
    {project.seed_sentence?.trim() && <section className={styles.origin}><button type="button" className={styles.originToggle} aria-expanded={originOpen} aria-controls="storyOrigin" onClick={() => setOriginOpen(open => !open)}><span>이야기의 출발점</span><span>{originOpen ? "접기" : "펼치기"}</span></button><p id="storyOrigin" hidden={!originOpen}>{project.seed_sentence}</p></section>}
    <section className={styles.unitSection} aria-labelledby="manuscriptHeading"><h2 id="manuscriptHeading" className="zSectionTitle">원고</h2>
      {units.length ? <><ul className={styles.unitList}>{units.map((unit,index) => <li key={unit.id}><Link href={getFocusPath(project.id,unit.id)}><span className="zHelper">{unitLabel} {getUnitNumber(index)}</span>{unit.title && <span>{unit.title}</span>}{unit.id === lastUnit?.id && <span className="zHelper">마지막으로 쓴 원고</span>}</Link></li>)}</ul>
        {continuationUnit ? <PrimaryTextCta href={getFocusPath(project.id,continuationUnit.id)}>이어 쓰기</PrimaryTextCta> : <p className="zHelper">위 목록에서 이어 쓸 원고를 선택해 주세요.</p>}
        <div><button type="button" className="zQuietAction" disabled={busy || panel !== null || state === "conflict"} onClick={() => startTransition(createUnit)}>{createText}</button></div>
      </> : <PrimaryTextCta disabled={busy || panel !== null || state === "conflict"} loading={busy} onClick={() => startTransition(createUnit)}>{createText}</PrimaryTextCta>}
    </section>
    <section className={styles.unitSection}><h2 className="zSectionTitle">이야기의 방향</h2><Link href={`/projects/${project.id}/direction`} className="zSecondaryLink">내 생각 돌아보기 →</Link></section>
  </>;
}
