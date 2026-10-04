export type ManuscriptData = { id: string; projectId: string; content: string; createdAt: string; updatedAt: string };
export type ManuscriptLoad = { kind: "empty" } | { kind: "single"; manuscript: ManuscriptData } | { kind: "multiple" };
export type SaveResult = { kind: "saved"; manuscript: ManuscriptData; status?: "created" | "existing_retry" } | { kind: "error" | "conflict" | "authRequired"; message: string };
export type SaveState = "initial" | "dirty" | "saving" | "saved" | "error" | "conflict";
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
export function validateContent(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return "원고를 입력해 주세요.";
  if (Array.from(value).length > 100000) return "원고는 100000자 이하로 작성해 주세요.";
  return null;
}
