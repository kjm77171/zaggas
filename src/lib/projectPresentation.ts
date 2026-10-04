export function getCreationTypeLabel(value: string | null): string {
  switch (value) {
    case "SCREENPLAY": return "시나리오";
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
