"use client";

import { useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { saveState, validateOnboardingDraft, type ExperienceState } from "@/app/firstExperience/draft";
import styles from "@/app/firstExperience/firstExperience.module.css";

export default function KakaoStartButton({ draft }: { draft?: ExperienceState }) {
  const inFlight = useRef(false);
  const draftIdRef = useRef(draft?.draftId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function start() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      if (process.env.NODE_ENV === "development" && window.location.origin !== "http://localhost:3000") {
        throw new Error("로그인은 http://localhost:3000에서 시작해 주세요.");
      }
      const supabase = createSupabaseBrowserClient();
      if (draft) {
        draftIdRef.current ??= crypto.randomUUID();
        const prepared = { ...draft, draftId: draftIdRef.current };
        if (!validateOnboardingDraft(prepared)) throw new Error("관심 분야와 문장을 다시 확인해 주세요.");
        saveState(prepared);
      }
      // Explicitly request profile scopes without account_email.
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "kakao",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            scope: "profile_nickname,profile_image",
          },
        },
      });
      if (error) throw new Error("카카오 로그인을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "로그인을 시작하지 못했습니다.");
      inFlight.current = false;
      setBusy(false);
    }
  }

  return <div>
    <button type="button" className={styles.kakao} disabled={busy} onClick={start}>{busy ? "카카오로 이동하고 있어요…" : "카카오로 시작하기"}</button>
    {error && <p className={styles.error} role="alert">{error}</p>}
  </div>;
}
