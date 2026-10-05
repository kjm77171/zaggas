import { creationTypes } from "./creationTypes";
export function getCreationTypeLabel(value: string | null): string {
  return creationTypes.find(item => item.code === value)?.label ?? "형식 미정";
}
export function getLastSavedAt(projectTime: string, storyTime?: string): string {
  return storyTime && Date.parse(storyTime) > Date.parse(projectTime) ? storyTime : projectTime;
}
export function formatProjectDate(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function getProjectTitle(title: string | null): string { return title === null ? "제목 미정" : title; }

export function getContinuationProjects<T extends { id: string; created_at: string; last_writing_at: string | null }>(projects: T[]) {
  const ordered = [...projects].sort((a,b) => {
    if (a.last_writing_at !== null && b.last_writing_at === null) return -1;
    if (a.last_writing_at === null && b.last_writing_at !== null) return 1;
    return (a.last_writing_at && b.last_writing_at ? Date.parse(b.last_writing_at) - Date.parse(a.last_writing_at) : 0) || Date.parse(b.created_at) - Date.parse(a.created_at) || a.id.localeCompare(b.id);
  });
  return { hero: ordered[0], others: ordered.slice(1) };
}
