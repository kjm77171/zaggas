import { interests } from "./interests";

export type ExperienceStep = "landing" | "interest" | "possibility" | "mini" | "conversion";
export type ExperienceState = { step: ExperienceStep; selectedInterestIds: string[]; sentence: string; draftId?: string };
export type OnboardingDraft = { draftId: string; selectedInterestIds: string[]; sentence: string };
export const storageKey = "zaggas.firstExperience.v1";
export const emptyState: ExperienceState = { step: "landing", selectedInterestIds: [], sentence: "" };
const steps: ExperienceStep[] = ["landing", "interest", "possibility", "mini", "conversion"];

export function isDraftId(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function validateOnboardingDraft(value: unknown): value is OnboardingDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as Partial<OnboardingDraft>;
  if (!isDraftId(draft.draftId) || !Array.isArray(draft.selectedInterestIds)) return false;
  const selected = draft.selectedInterestIds;
  if (!selected.length || selected.length > interests.length || new Set(selected).size !== selected.length) return false;
  if (!selected.every((id) => typeof id === "string" && interests.some((interest) => interest.id === id))) return false;
  if (selected.includes("unsure") && selected.length !== 1) return false;
  return typeof draft.sentence === "string" && Boolean(draft.sentence.trim()) && Array.from(draft.sentence).length <= 500;
}

export function restoreState(): ExperienceState {
  try {
    const stored = sessionStorage.getItem(storageKey);
    if (!stored) return emptyState;
    const parsed: unknown = JSON.parse(stored);
    if (!parsed || typeof parsed !== "object") return emptyState;
    const value = parsed as Partial<ExperienceState>;
    let selectedInterestIds = Array.isArray(value.selectedInterestIds) ? [...new Set(value.selectedInterestIds.filter((id): id is string => typeof id === "string" && interests.some((interest) => interest.id === id)))] : [];
    if (selectedInterestIds.includes("unsure")) selectedInterestIds = ["unsure"];
    const sentence = typeof value.sentence === "string" ? Array.from(value.sentence).slice(0, 500).join("") : "";
    let step = steps.includes(value.step as ExperienceStep) ? value.step as ExperienceStep : "landing";
    if (["possibility", "mini", "conversion"].includes(step) && !selectedInterestIds.length) step = "interest";
    if (step === "conversion" && !sentence.trim()) step = "mini";
    return { step, selectedInterestIds, sentence, ...(isDraftId(value.draftId) ? { draftId: value.draftId } : {}) };
  } catch {
    return emptyState;
  }
}

export function saveState(state: ExperienceState) {
  const serialized = JSON.stringify(state);
  sessionStorage.setItem(storageKey, serialized);
  if (sessionStorage.getItem(storageKey) !== serialized) throw new Error("Draft storage unavailable");
}

export function readOnboardingDraft(): OnboardingDraft | null {
  const stored = sessionStorage.getItem(storageKey);
  if (stored === null) return null;
  const parsed: unknown = JSON.parse(stored);
  if (!validateOnboardingDraft(parsed)) throw new Error("Invalid draft");
  return { draftId: parsed.draftId, selectedInterestIds: parsed.selectedInterestIds, sentence: parsed.sentence };
}

export function clearOnboardingDraft(draftId: string) {
  const current = readOnboardingDraft();
  if (current?.draftId === draftId) sessionStorage.removeItem(storageKey);
}
