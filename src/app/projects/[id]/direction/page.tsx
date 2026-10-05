import { notFound, redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { getAuthUserId } from "@/lib/auth";
import { createSupabaseSessionClient } from "@/lib/supabase/session";
import { getProjectForOwner } from "@/lib/projects";
import { getDirectionAnswers } from "@/lib/storyDirectionData";
import { isUuid } from "../workspaceTypes";
import DirectionEditor from "./DirectionEditor";
import styles from "../workspace.module.css";
export default async function DirectionPage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthUserId();
  if (!userId) redirect("/login");
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const client = await createSupabaseSessionClient();
  const project = await getProjectForOwner(client, userId, id);
  if (!project) notFound();
  const answers = await getDirectionAnswers(client, id);
  return <AppShell><main className={styles.workspace}><DirectionEditor projectId={id} title={project.title} seedSentence={project.seed_sentence} initial={answers} /></main></AppShell>;
}
