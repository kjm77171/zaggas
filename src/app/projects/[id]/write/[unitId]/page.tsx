import Link from "next/link";
import ProseEditor from "./ProseEditor";
import { notFound, redirect } from "next/navigation";
import { getAuthUserId } from "@/lib/auth";
import { createSupabaseSessionClient } from "@/lib/supabase/session";
import { getProjectForOwner } from "@/lib/projects";
import { getActiveUnits, getScreenplayBlocks } from "@/lib/manuscriptUnits";
import { getUnitLabel, getUnitNumber } from "@/lib/manuscriptTypes";
import { getProjectTitle } from "@/lib/projectPresentation";
import { isUuid } from "../../workspaceTypes";
import styles from "./focus.module.css";
export default async function FocusPage({ params }: { params: Promise<{ id: string; unitId: string }> }) {
  const { id, unitId } = await params;
  if (!isUuid(id) || !isUuid(unitId)) notFound();
  const userId = await getAuthUserId();
  if (!userId) redirect("/login");
  const client = await createSupabaseSessionClient();
  const project = await getProjectForOwner(client, userId, id);
  if (!project) notFound();
  const units = await getActiveUnits(client, id);
  const index = units.findIndex(unit => unit.id === unitId);
  if (index < 0) notFound();
  const unit = units[index];
  const blocks = unit.content_format === "SCREENPLAY_BLOCKS" ? await getScreenplayBlocks(client, unit.id) : [];
  return <main className={styles.focus}>
    <Link href={`/projects/${id}`} className="zBackLink">← Workspace</Link>
    <header className={styles.context}><h1>{getProjectTitle(project.title)}</h1><p className="zHelper">{getUnitLabel(project.creation_type)} {getUnitNumber(index)}{unit.title ? ` · ${unit.title}` : ""}</p></header>
    {unit.content_format === "SCREENPLAY_BLOCKS" && <p className="zHelper">지금은 저장된 장면을 읽는 화면입니다. 편집은 아직 제공하지 않습니다.</p>}
    {unit.content_format === "PROSE" ? <ProseEditor key={`${userId}/${id}/${unit.id}`} userId={userId} projectId={id} unitId={unit.id} content={unit.content} revision={unit.revision} /> : <section className={styles.surface} aria-label="저장된 원고">
      {blocks.length ? blocks.map(block => <p key={block.id} className={block.block_type === "CHARACTER" || block.block_type === "DIALOGUE" ? styles.dialogue : undefined}>{block.content}</p>) : <p className="zHelper">아직 작성된 장면이 없습니다.</p>}
    </section>}
  </main>;
}
