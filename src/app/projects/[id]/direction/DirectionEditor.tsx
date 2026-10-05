"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import WorkspaceNavigation from "@/components/WorkspaceNavigation";
import PrimaryTextCta from "@/components/PrimaryTextCta";
import { directionQuestions, normalizeAnswer, validAnswer, type DirectionAnswer, type DirectionRequest } from "@/lib/storyDirection";
import { getProjectTitle } from "@/lib/projectPresentation";
import { saveDirectionAction } from "./actions";
import styles from "./direction.module.css";

type PendingSave = { request: DirectionRequest; destination: number };
const positions = ["첫 번째", "두 번째", "세 번째", "네 번째"];

export default function DirectionEditor({ projectId, title, seedSentence, initial }: {
  projectId: string; title: string | null; seedSentence: string | null; initial: DirectionAnswer[];
}) {
  const [answers, setAnswers] = useState(initial);
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState(initial[0].answer ?? "");
  const [fromReview, setFromReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [pending, setPending] = useState<PendingSave | null>(null);
  const [conflict, setConflict] = useState<DirectionAnswer | null>(null);
  const inFlight = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const focusAfterMove = useRef(false);
  const current = answers[index];
  const dirty = Boolean(current && normalizeAnswer(draft) !== current.answer);
  const locked = busy || Boolean(pending);
  const navigationState = useRef({ dirty, locked });
  useLayoutEffect(() => { navigationState.current = { dirty, locked }; }, [dirty, locked]);

  useEffect(() => {
    function warn(event: BeforeUnloadEvent) {
      const state = navigationState.current;
      if (!state.dirty && !state.locked) return;
      event.preventDefault();
      event.returnValue = "";
    }
    function guard(event: MouseEvent) {
      if (event.defaultPrevented || !(event.target instanceof Element)) return;
      const anchor = event.target.closest("a[href]");
      if (!anchor) return;
      const state = navigationState.current;
      if (state.locked) {
        event.preventDefault();
        event.stopPropagation();
        setMessage("저장 결과를 먼저 확인해 주세요. 같은 요청으로 다시 시도할 수 있습니다.");
      } else if (state.dirty && !window.confirm("저장하지 않은 답변을 두고 이동할까요?")) {
        event.preventDefault();
        event.stopPropagation();
      } else if (state.dirty) {
        // The link was explicitly approved; avoid a second beforeunload prompt.
        navigationState.current = { dirty: false, locked: false };
      }
    }
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", guard, true);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", guard, true);
    };
  }, []);

  useEffect(() => {
    if (!focusAfterMove.current) return;
    focusAfterMove.current = false;
    headingRef.current?.focus();
  }, [index]);

  useEffect(() => {
    function resize() {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.style.height = "200px";
      const maximum = window.matchMedia("(max-width: 600px)").matches
        ? Math.max(200, Math.min(320, window.innerHeight * 0.45)) : 400;
      const border = textarea.offsetHeight - textarea.clientHeight;
      const height = Math.min(maximum, Math.max(200, textarea.scrollHeight + border));
      textarea.style.height = height + "px";
      textarea.style.overflowY = textarea.scrollHeight + border > maximum ? "auto" : "hidden";
    }
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [index, draft]);

  function show(next: number, rows = answers, reviewEdit = false) {
    focusAfterMove.current = next !== index;
    setIndex(next);
    setDraft(rows[next]?.answer ?? "");
    setFromReview(reviewEdit);
    setMessage("");
    setInvalid(false);
    setConflict(null);
  }

  function move(next: number, reviewEdit = false) {
    if (inFlight.current || pending) return;
    if (dirty && !window.confirm("저장하지 않은 답변을 두고 이동할까요?")) return;
    show(next, answers, reviewEdit);
  }

  async function save() {
    if (inFlight.current || !current || conflict) return;
    if (!validAnswer(draft)) {
      setInvalid(true);
      setMessage("답변은 2,000자까지 저장할 수 있습니다.");
      textareaRef.current?.focus();
      return;
    }
    const operation = pending ?? {
      request: { projectId, questionKey: current.questionKey, answer: normalizeAnswer(draft),
        questionSetVersion: 1, expectedRevision: current.revision, requestId: crypto.randomUUID() },
      destination: fromReview ? 4 : index + 1,
    };
    setPending(operation);
    inFlight.current = true;
    navigationState.current = { dirty, locked: true };
    setBusy(true);
    setInvalid(false);
    setMessage("");
    try {
      const result = await saveDirectionAction(operation.request);
      if (result.status === "error") { setMessage(result.message); return; }
      if (result.status === "conflict") {
        setConflict(result.current);
        setPending(null);
        setMessage("다른 곳에서 답변이 변경되었습니다.");
        return;
      }
      if (!["saved", "noop", "existing_retry"].includes(result.status)) {
        setMessage("저장 결과를 확인하지 못했습니다. 같은 요청으로 다시 시도해 주세요.");
        return;
      }
      const rows = answers.map(row => row.questionKey === result.current.questionKey ? result.current : row);
      setAnswers(rows);
      setPending(null);
      show(operation.destination, rows);
    } catch {
      setMessage("저장 결과를 확인하지 못했습니다. 같은 요청으로 다시 시도해 주세요.");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  function loadLatest() {
    if (!conflict) return;
    if (normalizeAnswer(draft) !== conflict.answer && !window.confirm("입력한 내용을 최신 답변으로 바꿀까요?")) return;
    setAnswers(previous => previous.map(row => row.questionKey === conflict.questionKey ? conflict : row));
    setDraft(conflict.answer ?? "");
    setConflict(null);
    setMessage("");
    setInvalid(false);
    headingRef.current?.focus();
  }

  const question = directionQuestions[index];
  const hasAnswers = answers.some(row => row.answer !== null);
  return <>
    <a href="/my" className="zBackLink">← My ZAGGAS</a>
    <h1 className="zPageTitle">{getProjectTitle(title)}</h1>
    <WorkspaceNavigation projectId={projectId} active="direction" />
    {question ? <section className={styles.thought} aria-labelledby="directionQuestion">
      <p className={`zHelper ${styles.position}`} aria-label={`${positions[index]} 질문, 총 네 질문`}>
        <span aria-hidden="true">{String(index + 1).padStart(2, "0")} / 04</span>
      </p>
      <form onSubmit={event => { event.preventDefault(); void save(); }}>
        <h2 ref={headingRef} tabIndex={-1} id="directionQuestion" className={`zSectionTitle ${styles.question}`}>
          <label htmlFor="directionAnswer">{question.question}</label>
        </h2>
        {question.helper && <p className="zHelper" id="directionHelper">{question.helper}</p>}
        {index === 0 && seedSentence?.trim() && <details className={styles.origin}>
          <summary className="zQuietAction">처음 떠올렸던 생각 보기</summary>
          <p className="zHelper zAnswer">{seedSentence}</p>
        </details>}
        <textarea ref={textareaRef} id="directionAnswer" className={`zInput ${styles.writingArea}`}
          aria-describedby={[question.helper ? "directionHelper" : "", message ? "directionStatus" : ""].filter(Boolean).join(" ") || undefined}
          aria-invalid={invalid || undefined} value={draft} readOnly={locked}
          onChange={event => { setDraft(event.target.value); setInvalid(false); if (!conflict) setMessage(""); }} />
        <div className={styles.actions}>
          <PrimaryTextCta type="submit" disabled={busy || Boolean(conflict)} loading={busy}>
            {busy ? "저장 중…" : pending ? "같은 요청 다시 시도" : fromReview || index === 3 ? "저장하고 돌아보기" : "저장하고 다음"}
          </PrimaryTextCta>
          <button className="zQuietAction" type="button" disabled={locked} onClick={() => move(fromReview ? 4 : index + 1)}>건너뛰기</button>
          {index > 0 && !fromReview && <button className="zQuietAction" type="button" disabled={locked} onClick={() => move(index - 1)}>이전 질문</button>}
        </div>
      </form>
      {conflict && <div className={styles.conflict}>
        <p className="zHelper">최신 답변</p>
        <p className="zAnswer">{conflict.answer ?? "아직 답변이 없습니다."}</p>
        <button className="zQuietAction" type="button" onClick={loadLatest}>최신 답변 불러오기</button>
      </div>}
    </section> : <section className={styles.review} aria-labelledby="directionReview">
      <h2 ref={headingRef} tabIndex={-1} id="directionReview" className="zSectionTitle">지금 남긴 생각</h2>
      {hasAnswers ? directionQuestions.map((item, position) => answers[position].answer !== null && <section className={styles.answer} key={item.key}>
        <h3 className="zSectionTitle">{item.heading}</h3>
        <p className="zAnswer">{answers[position].answer}</p>
        <button className="zQuietAction" type="button" aria-label={`${item.heading} 수정`} onClick={() => move(position, true)}>수정</button>
      </section>) : <p className="zBodySmall">지금은 남기지 않아도 괜찮아요.</p>}
      <div className={styles.actions}>
        <PrimaryTextCta href={`/projects/${projectId}`}>원고로 돌아가기</PrimaryTextCta>
        {!hasAnswers && <button className="zQuietAction" type="button" onClick={() => move(0)}>생각 남기기</button>}
      </div>
    </section>}
    <p id="directionStatus" className={`zHelper ${styles.status}`} role="status" aria-live="polite">{message}</p>
  </>;
}