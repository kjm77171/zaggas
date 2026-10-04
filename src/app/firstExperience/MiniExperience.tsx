"use client";

import { useRef, useState } from "react";
import styles from "./firstExperience.module.css";

export default function MiniExperience({ sentence, onChange, onContinue }: { sentence: string; onChange: (value: string) => void; onContinue: () => void }) {
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const count = Array.from(sentence).length;

  return (
    <form className={styles.form} noValidate onSubmit={(event) => {
      event.preventDefault();
      if (!sentence.trim() || count > 500) {
        setError(!sentence.trim() ? "떠오른 생각을 한 문장 적어주세요." : "500자 안에서 들려주세요.");
        inputRef.current?.focus();
        return;
      }
      setError("");
      onContinue();
    }}>
      <label htmlFor="experienceSentence" className={styles.inputLabel}>완성된 문장이 아니어도 괜찮아요.</label>
      <textarea ref={inputRef} id="experienceSentence" value={sentence} onChange={(event) => { onChange(event.target.value); setError(""); }} rows={4} maxLength={500} required aria-invalid={Boolean(error)} aria-describedby={`sentenceCount sentenceNote${error ? " sentenceError" : ""}`} placeholder="어느 날, 문득 떠오른 이야기…" />
      <div className={styles.inputMeta}><span id="sentenceNote">이 문장은 이 탭에서 잠시 이어갈 수 있어요.</span><span id="sentenceCount">{count} / 500</span></div>
      {error && <p id="sentenceError" role="alert" className={styles.error}>{error}</p>}
      <button type="submit" className={styles.primary}>내 문장 살펴보기 <span aria-hidden="true">→</span></button>
    </form>
  );
}
