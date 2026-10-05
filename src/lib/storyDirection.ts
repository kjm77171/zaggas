export const directionQuestions = [
  { key: "focus", question: "이 글에서 지금 가장 마음이 가는 것은 무엇인가요?", helper: "사람, 순간, 생각, 감정 중 무엇이든 괜찮아요.", heading: "지금 마음이 가는 것" },
  { key: "exploration", question: "그것에 대해 아직 잘 모르겠거나, 더 궁금한 것은 무엇인가요?", helper: "정답을 찾지 않아도 괜찮아요. 지금 떠오르는 질문만 남겨보세요.", heading: "아직 궁금한 것" },
  { key: "meaning", question: "왜 이것이 마음에 남았을까요?", helper: "이유를 정확히 설명하지 못해도 괜찮아요.", heading: "마음에 남는 이유" },
  { key: "after_feeling", question: "이 글을 읽고 어떤 느낌이나 생각이 남았으면 하나요?", helper: "", heading: "남기고 싶은 느낌" },
] as const;
export type QuestionKey = typeof directionQuestions[number]["key"];
export type DirectionAnswer = { questionKey: QuestionKey; answer: string | null; revision: number; questionSetVersion: number; updatedAt: string | null };
export type DirectionRequest = { projectId: string; questionKey: QuestionKey; answer: string | null; questionSetVersion: number; expectedRevision: number; requestId: string };
export type DirectionResult = { status: "saved" | "noop" | "existing_retry" | "conflict"; current: DirectionAnswer } | { status: "error"; message: string };
export function isQuestionKey(value: unknown): value is QuestionKey { return directionQuestions.some(question => question.key === value); }
export function normalizeAnswer(value: string | null) { return value === null || !value.trim() ? null : value; }
export function validAnswer(value: unknown): value is string | null { return value === null || (typeof value === "string" && (normalizeAnswer(value) === null || Array.from(value).length <= 2000)); }
export function emptyAnswer(questionKey: QuestionKey): DirectionAnswer { return { questionKey, answer: null, revision: 0, questionSetVersion: 1, updatedAt: null }; }
export function parseDirectionAnswer(value: unknown): DirectionAnswer | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (!isQuestionKey(row.question_key) || !validAnswer(row.answer) || row.question_set_version !== 1 || !Number.isInteger(row.revision) || (row.revision as number) < 0 || (row.revision as number) > 2147483647 || !(row.updated_at === null || (typeof row.updated_at === "string" && Number.isFinite(Date.parse(row.updated_at))))) return null;
  if ((row.revision === 0 && (row.answer !== null || row.updated_at !== null)) || (row.revision !== 0 && row.updated_at === null)) return null;
  return { questionKey: row.question_key, answer: row.answer, revision: row.revision as number, questionSetVersion: 1, updatedAt: row.updated_at };
}
