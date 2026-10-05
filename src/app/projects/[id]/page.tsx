import { notFound, redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { getAuthUserId } from "@/lib/auth";
import { createSupabaseSessionClient } from "@/lib/supabase/session";
import { getProjectForOwner } from "@/lib/projects";
import { getActiveUnits } from "@/lib/manuscriptUnits";
import { isUuid } from "./workspaceTypes";
import WritingWorkspace from "./WritingWorkspace";
import styles from "./workspace.module.css";
export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const userId = await getAuthUserId();
  if (!userId) redirect("/login");
  const client = await createSupabaseSessionClient();
  const project = await getProjectForOwner(client, userId, id);
  if (!project) notFound();
  const units = await getActiveUnits(client, id);
  return <AppShell><main className={styles.workspace}><WritingWorkspace key={project.id} project={project} units={units} /></main></AppShell>;
}
