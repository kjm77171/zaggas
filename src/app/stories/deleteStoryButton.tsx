"use client";

import { useActionState, useState } from "react";
import { deleteStoryAction } from "./actions";

export default function DeleteStoryButton({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false);
  const [state, formAction, pending] = useActionState(deleteStoryAction.bind(null, id), { message: "" });

  return (
    <div>
      {!confirming ? <button type="button" className="secondary" onClick={() => setConfirming(true)}>삭제</button> : (
        <form action={formAction}>
          <p>이 이야기를 삭제할까요? 삭제 후 복구할 수 없습니다.</p>
          <input type="hidden" name="confirmed" value="yes" />
          <div className="actions">
            <button type="submit" disabled={pending}>{pending ? "삭제 중…" : "삭제 확인"}</button>
            <button type="button" className="secondary" disabled={pending} onClick={() => setConfirming(false)}>취소</button>
          </div>
        </form>
      )}
      {state.message && <p role="alert">{state.message}</p>}
    </div>
  );
}
