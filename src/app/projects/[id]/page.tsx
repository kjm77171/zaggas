import { notFound, redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { getAuthUserId } from "@/lib/auth";
import { createSupabaseSessionClient } from "@/lib/supabase/session";
import { getProjectForOwner } from "@/lib/projects";
import { getProjectManuscript } from "@/lib/projectStories";
import { getCreationTypeLabel } from "@/lib/projectPresentation";
import { interests } from "@/app/firstExperience/interests";
import { isUuid } from "./workspaceTypes";
import WritingWorkspace from "./WritingWorkspace";
import styles from "./workspace.module.css";
export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthUserId();
  if (!userId) redirect("/login");
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const client = await createSupabaseSessionClient();
  const project = await getProjectForOwner(client, userId, id);
  if (!project) notFound();
  const manuscript = await getProjectManuscript(client, userId, id);
  const labels = interests.filter((item) => project.initial_interest_codes?.includes(item.id)).map((item) => item.label);
  return <AppShell><main className={styles.workspace}>
    <WritingWorkspace projectId={project.id} initial={manuscript} initialProject={{ title: project.title, updatedAt: project.updated_at }} creationLabel={getCreationTypeLabel(project.creation_type)}>
      {project.seed_sentence && <details className={styles.seed} open><summary>시작 문장</summary><p>{project.seed_sentence}</p></details>}
      {labels.length > 0 && <details className={styles.context}><summary>이야기의 출발점</summary><p>시작할 때 마음이 갔던 방향: {labels.join(", ")}</p></details>}
    </WritingWorkspace>
  </main></AppShell>;
}
