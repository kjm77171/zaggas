"use client";

import { useActionState } from "react";
import { saveStoryAction } from "./actions";

export default function StoryForm({ id = null, title = "", content = "" }: { id?: string | null; title?: string; content?: string }) {
  const [state, formAction, pending] = useActionState(saveStoryAction.bind(null, id), { message: "", title, content });

  return (
    <form action={formAction} className="storyForm" noValidate>
      <label htmlFor="title">제목</label>
      <input id="title" name="title" defaultValue={state.title} required aria-describedby={state.message ? "formError" : undefined} />
      <label htmlFor="content">본문</label>
      <textarea id="content" name="content" defaultValue={state.content} rows={16} required aria-describedby={state.message ? "formError" : undefined} />
      {state.message && <p id="formError" role="alert">{state.message}</p>}
      <button type="submit" disabled={pending}>{pending ? "저장 중…" : id ? "수정 저장" : "이야기 등록"}</button>
    </form>
  );
}
