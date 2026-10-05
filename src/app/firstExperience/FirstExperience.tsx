"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import StartStoryButton from "./StartStoryButton";
import MiniExperience from "./MiniExperience";
import { interests } from "./interests";
import styles from "./firstExperience.module.css";
import PrimaryTextCta from "@/components/PrimaryTextCta";

import KakaoStartButton from "@/app/auth/KakaoStartButton";
import { restoreState, saveState, type ExperienceState, type ExperienceStep } from "./draft";
const subscribe = () => () => {};

function Experience({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [state, setState] = useState<ExperienceState>(restoreState);
  const [startError, setStartError] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef(state.step);
  const { step, selectedInterestIds, sentence } = state;

  useEffect(() => {
    try { saveState(state); } catch { /* Continue in memory when storage is unavailable. */ }
  }, [state]);

  useEffect(() => {
    if (previousStep.current !== step) {
      headingRef.current?.focus();
      previousStep.current = step;
    }
  }, [step]);

  function startExperience() {
    try {
      const draftId = state.draftId ?? crypto.randomUUID();
      setState((current) => ({ ...current, draftId, step: "interest" }));
      setStartError("");
    } catch {
      setStartError("안전하게 이야기를 시작하지 못했습니다. localhost에서 다시 시도해 주세요.");
    }
  }

  function goTo(nextStep: ExperienceStep) {
    setState((current) => ({ ...current, step: nextStep }));
  }

  function toggleInterest(id: string) {
    setState((current) => {
      const selected = current.selectedInterestIds;
      const selectedInterestIds = selected.includes(id) ? selected.filter((item) => item !== id) : id === "unsure" ? [id] : [...selected.filter((item) => item !== "unsure"), id];
      return { ...current, selectedInterestIds };
    });
  }

  const titles: Record<ExperienceStep, React.ReactNode> = {
    landing: <>당신 안에는<br />어떤 이야기가 있나요?</>,
    interest: <>언젠가 만들어보고 싶었던<br />이야기가 있나요?</>,
    possibility: <>좋아요.<br />그 이야기를 한번 시작해볼까요?</>,
    mini: <>머릿속에 있는 이야기를<br />한 문장만 들려주세요.</>,
    conversion: <>이 이야기를<br />계속 만들어볼까요?</>,
  };
  const previousSteps: Partial<Record<ExperienceStep, ExperienceStep>> = { interest: "landing", possibility: "interest", mini: "possibility", conversion: "mini" };

  return (
    <main className={styles.experience}>
      {step !== "landing" && <div className={styles.stepNavigation}><button type="button" className={styles.back} onClick={() => goTo(previousSteps[step]!)}>이전</button></div>}
      <section className={styles.content} aria-labelledby="experienceTitle">
        {startError && <p role="alert" className={styles.error}>{startError}</p>}
        <div key={step} className={styles.step}>
          <h1 id="experienceTitle" ref={headingRef} tabIndex={-1} className={styles.title}>{titles[step]}</h1>
          {step === "landing" && <><p className={styles.description}>아직 이야기가 아니어도 괜찮아요.<br />장면 하나, 생각 하나에서 시작해도 됩니다.</p><PrimaryTextCta className={styles.primary} onClick={startExperience}>시작해볼까요?</PrimaryTextCta></>}
          {step === "interest" && <>
            <fieldset className={styles.interests}><legend>마음이 가는 이야기를 골라주세요. 여러 개도 좋아요.</legend><div className={styles.options}>{interests.map((interest) => <label key={interest.id} className={styles.option}><input type="checkbox" checked={selectedInterestIds.includes(interest.id)} onChange={() => toggleInterest(interest.id)} /><span>{interest.label}</span></label>)}</div></fieldset>
            <PrimaryTextCta className={styles.primary} disabled={!selectedInterestIds.length} onClick={() => goTo("possibility")}>계속해볼까요?</PrimaryTextCta>
          </>}
          {step === "possibility" && <>
            <p className={styles.description}>{selectedInterestIds.includes("unsure") ? "어떤 이야기인지 아직 몰라도 괜찮아요." : selectedInterestIds.length === 1 ? `${interests.find((interest) => interest.id === selectedInterestIds[0])?.label}, 처음이어도 괜찮아요.` : "여러 마음이 만나 하나의 이야기가 될 수도 있어요."}<br />완성된 줄거리보다 작은 생각 하나면 충분해요.</p>
            <p className={styles.philosophy}>당신의 이야기를 대신 쓰지 않습니다.<br />당신이 끝까지 써낼 수 있도록 함께합니다.</p><p className={styles.ownership}>이야기는 당신의 것입니다.</p>
            <PrimaryTextCta className={styles.primary} onClick={() => goTo("mini")}>한 문장으로 시작하기</PrimaryTextCta>
          </>}
          {step === "mini" && <MiniExperience sentence={sentence} onChange={(value) => setState((current) => ({ ...current, sentence: value }))} onContinue={() => goTo("conversion")} />}
          {step === "conversion" && <>
            <blockquote className={styles.sentence}>{sentence}</blockquote>
            <p className={styles.question}>이 이야기에서 가장 먼저 떠오르는 사람은 누구인가요?</p>
            <p className={styles.description}>지금 적은 한 문장이<br />당신의 첫 번째 이야기의 시작이 될 수 있습니다.</p>
            {isAuthenticated ? <StartStoryButton draft={state} /> : <KakaoStartButton draft={state} />}
            <button className={styles.back} onClick={() => goTo("mini")}>내 문장 다시 보기</button>
            <p className={styles.note}>작성한 문장을 당신의 공간에 보관하고 이어갈 수 있어요.</p>
          </>}
        </div>
      </section>
    </main>
  );
}

export default function FirstExperience({ isAuthenticated }: { isAuthenticated: boolean }) {
  const isClient = useSyncExternalStore(subscribe, () => true, () => false);
  return isClient ? <Experience isAuthenticated={isAuthenticated} /> : <main className={styles.experience} aria-busy="true"></main>;
}
