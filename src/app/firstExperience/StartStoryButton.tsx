"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { completeOnboarding } from "@/app/auth/actions";
import { clearOnboardingDraft, saveState, validateOnboardingDraft, type ExperienceState } from "./draft";
import styles from "./firstExperience.module.css";

export default function StartStoryButton({ draft }: { draft: ExperienceState }) {
  const router = useRouter();
  const inFlight = useRef(false);
  const draftIdRef = useRef(draft.draftId);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function start() {
    if (inFlight.current) return;
    inFlight.current = true;
    setError("");
    startTransition(async () => {
      try {
        draftIdRef.current ??= crypto.randomUUID();
        const prepared = { ...draft, draftId: draftIdRef.current };
        if (!validateOnboardingDraft(prepared)) {
          setError("관심 분야와 문장을 다시 확인해 주세요.");
          return;
        }
        saveState(prepared);
        const result = await completeOnboarding(prepared);
        if (result.error) {
          setError(result.error);
          return;
        }
        clearOnboardingDraft(prepared.draftId);
        router.replace("/my");
        router.refresh();
      } catch {
        setError("이야기를 시작하지 못했습니다. 입력을 확인한 뒤 다시 시도해 주세요.");
      } finally {
        inFlight.current = false;
      }
    });
  }

  return <div aria-busy={pending}>
    <button type="button" className={styles.primary} disabled={pending} onClick={start}>{pending ? "이야기를 보관하고 있어요…" : "이 이야기 시작하기"}</button>
    {error && <p className={styles.error} role="alert">{error}</p>}
  </div>;
}
