import { notFound, redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { getAuthUserId } from "@/lib/auth";
import { createSupabaseSessionClient } from "@/lib/supabase/session";
import { getProjectForOwner } from "@/lib/projects";
import { getProjectManuscript } from "@/lib/projectStories";
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
  return <AppShell><main className={styles.workspace}>
    <WritingWorkspace projectId={project.id} initial={manuscript} initialProject={{ title: project.title, updatedAt: project.updated_at }} initialCreationType={project.creation_type} seedSentence={project.seed_sentence} />
  </main></AppShell>;
}
