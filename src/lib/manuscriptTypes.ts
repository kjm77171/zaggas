export type ManuscriptUnit = { id: string; project_id: string; title: string | null; content: string | null; content_format: "PROSE" | "SCREENPLAY_BLOCKS"; revision: number; created_at: string; updated_at: string };
export type ScreenplayBlock = { id: string; block_type: "SCENE_HEADING" | "ACTION" | "CHARACTER" | "DIALOGUE"; content: string | null };
export type UnitCreateRequest = { projectId: string; unitId: string; requestId: string; expectedStructureRevision: number };
export type UnitCreateResult = { kind: "created"; unitId: string } | { kind: "existing_retry"; unitId: string } | { kind: "conflict"; message: string } | { kind: "unknown" | "error" | "authRequired"; message: string };
export function getUnitLabel(type: string | null): string {
  return type === "SCREENPLAY" ? "장면" : type === "NOVEL" ? "장" : type === "WEB_NOVEL" ? "회차" : "글";
}
export function getUnitNumber(index: number): string { return String(index + 1).padStart(2, "0"); }
export function getFocusPath(projectId: string, unitId: string): string { return `/projects/${projectId}/write/${unitId}`; }
