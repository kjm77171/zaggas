"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { readOnboardingDraft, clearOnboardingDraft } from "@/app/firstExperience/draft";
import { completeOnboarding } from "../actions";
import styles from "@/app/firstExperience/firstExperience.module.css";

export default function Handoff({ onboardingCompleted }: { onboardingCompleted: boolean }) {
  const router = useRouter();
  const inFlight = useRef(false);
  const started = useRef(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const [missing, setMissing] = useState(false);

  const handoff = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const draft = readOnboardingDraft();
      if (!draft) {
        if (onboardingCompleted) router.replace("/my");
        else setMissing(true);
        return;
      }
      const result = await completeOnboarding(draft);
      if (result.error) {
        setError(result.error);
        return;
      }
      // DB commit and owner-scoped SELECT have both succeeded before cleanup.
      clearOnboardingDraft(draft.draftId);
      router.replace("/my");
    } catch {
      setError("입력을 복원하거나 저장 결과를 정리하지 못했습니다. 문장을 확인한 뒤 다시 시도해 주세요.");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }, [onboardingCompleted, router]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void handoff();
  }, [handoff]);

  if (missing) return <><p className={styles.description}>아직 이어갈 문장이 없어요.<br />작은 생각 하나부터 시작해볼까요?</p><Link href="/">첫 문장 시작하기 →</Link></>;
  return <div aria-busy={busy}>
    {busy && <p className={styles.description} role="status">작성한 문장을 안전하게 이어가고 있어요.</p>}
    {error && <><p className={styles.error} role="alert">{error}</p><button className={styles.primary} type="button" disabled={busy} onClick={() => void handoff()}>다시 시도하기</button></>}
  </div>;
}
