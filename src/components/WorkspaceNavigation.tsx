import type { MouseEventHandler } from "react";
export default function WorkspaceNavigation({ projectId, active, onNavigate }: { projectId: string; active: "manuscript" | "direction"; onNavigate?: MouseEventHandler<HTMLAnchorElement> }) {
  return <nav aria-label="창작 도구" className="zWorkspaceNav">
    {active === "manuscript" ? <span aria-current="page">원고</span> : <a href={`/projects/${projectId}`} onClick={onNavigate}>원고</a>}
    {active === "direction" ? <span aria-current="page">이야기의 방향</span> : <a href={`/projects/${projectId}/direction`} onClick={onNavigate}>이야기의 방향</a>}
  </nav>;
}