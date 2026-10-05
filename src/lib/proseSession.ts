"use client";
import type { ProseAutosave } from "./proseAutosave";
const channelName = "zaggas-manuscript-logout";
type Message = { type: "inspect" | "status" | "stop" | "stopped"; userId: string; requestId: string; unconfirmed?: boolean; editorId?: string };
const localEditors = new Map<ProseAutosave, { userId: string; stop: () => void }>();
export function registerProseEditor(userId: string, engine: ProseAutosave, stop: () => void) {
  localEditors.set(engine, { userId, stop });
  const editorId = crypto.randomUUID();
  const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(channelName);
  if (channel) channel.onmessage = (event: MessageEvent<Message>) => {
    const data = event.data;
    if (!data || data.userId !== userId) return;
    if (data.type === "inspect") channel.postMessage({ type: "status", userId, requestId: data.requestId, editorId, unconfirmed: engine.unconfirmed || engine.phase === "ERROR" } satisfies Message);
    if (data.type === "stop") { stop(); void engine.stopForLogout().then(() => channel.postMessage({ type: "stopped", userId, editorId, requestId: data.requestId } satisfies Message)); }
  };
  return () => { localEditors.delete(engine); channel?.close(); };
}
export async function inspectActiveProse(userId: string) {
  let unconfirmed = [...localEditors].some(([engine, info]) => info.userId === userId && (engine.unconfirmed || engine.phase === "ERROR"));
  if (typeof BroadcastChannel === "undefined") return unconfirmed;
  const channel = new BroadcastChannel(channelName); const requestId = crypto.randomUUID();
  channel.onmessage = (event: MessageEvent<Message>) => { if (event.data?.type === "status" && event.data.userId === userId && event.data.requestId === requestId && event.data.unconfirmed) unconfirmed = true; };
  channel.postMessage({ type: "inspect", userId, requestId } satisfies Message);
  await new Promise(resolve => setTimeout(resolve, 200)); channel.close(); return unconfirmed;
}
export async function stopAccountProse(userId: string) {
  for (const [engine, info] of localEditors) if (info.userId === userId) { info.stop(); await engine.stopForLogout(); }
  if (typeof BroadcastChannel === "undefined") return;
  const channel = new BroadcastChannel(channelName); const requestId = crypto.randomUUID();
  const waiting = new Set<string>();
  channel.onmessage = (event: MessageEvent<Message>) => {
    const data = event.data;
    if (data?.userId === userId && data.requestId === requestId && data.type === "status" && data.editorId) waiting.add(data.editorId);
  };
  channel.postMessage({ type: "inspect", userId, requestId } satisfies Message);
  await new Promise(resolve => setTimeout(resolve, 200));
  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => { if (waiting.size) reject(new Error("다른 탭의 원고 정리를 확인하지 못했습니다.")); else resolve(); }, 2000);
      channel.onmessage = (event: MessageEvent<Message>) => {
        const data = event.data;
        if (data?.userId !== userId || data.requestId !== requestId || data.type !== "stopped" || !data.editorId) return;
        waiting.delete(data.editorId);
        if (!waiting.size) { clearTimeout(timeout); resolve(); }
      };
      channel.postMessage({ type: "stop", userId, requestId } satisfies Message);
    });
  } finally { channel.close(); }
}
