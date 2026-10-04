export function getCreationTypeLabel(value: string | null): string {
  switch (value) {
    case "SCREENPLAY": return "영화 · 시나리오";
    case "NOVEL": return "소설";
    case "WEB_NOVEL": return "웹소설";
    case "ESSAY": return "에세이";
    default: return "형식 미정";
  }
}
export function getLastSavedAt(projectTime: string, storyTime?: string): string {
  return storyTime && Date.parse(storyTime) > Date.parse(projectTime) ? storyTime : projectTime;
}
export function formatProjectDate(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function getProjectTitle(title: string | null): string { return title === null ? "제목 미정" : title; }

export function getContinuationProjects<T extends { id: string; created_at: string }>(projects: T[], summaries: ReadonlyMap<string, { count: number; updatedAt: string }>) {
  const tieBreak = (a: T, b: T) => Date.parse(b.created_at) - Date.parse(a.created_at) || a.id.localeCompare(b.id);
  const saved = projects.filter(p => summaries.get(p.id)?.count === 1).sort((a, b) => Date.parse(summaries.get(b.id)!.updatedAt) - Date.parse(summaries.get(a.id)!.updatedAt) || tieBreak(a, b));
  const empty = projects.filter(p => !summaries.get(p.id)?.count).sort(tieBreak);
  const review = projects.filter(p => (summaries.get(p.id)?.count ?? 0) >= 2).sort(tieBreak);
  const normal = [...saved, ...empty];
  return { hero: normal[0], others: normal.slice(1), review };
}
