"use server";
import { isNullableCreationType } from "@/lib/creationTypes";
import type { CreationTypeResult } from "./workspaceTypes";
import { revalidatePath } from "next/cache";
import { createSupabaseSessionClient } from "@/lib/supabase/session";
import { getProjectForOwner } from "@/lib/projects";
import { isUuid, isTimestamp, validateTitle, type TitleResult } from "./workspaceTypes";
export async function renameProjectAction(input: unknown): Promise<TitleResult> {
  if (!input || typeof input !== "object") return { kind: "error", message: "제목을 확인해 주세요." };
  const value = input as { projectId?: unknown; title?: unknown; expectedProjectUpdatedAt?: unknown };
  const invalid = validateTitle(value.title);
  if (!isUuid(value.projectId) || invalid || typeof value.title !== "string" || !isTimestamp(value.expectedProjectUpdatedAt)) return { kind: "error", message: invalid ?? "작업 정보를 확인해 주세요." };
  try {
    const client = await createSupabaseSessionClient();
    const { data: claims, error: authError } = await client.auth.getClaims();
    const userId = claims?.claims.sub;
    if (authError || !userId) return { kind: "authRequired", message: "로그인이 만료되었습니다. 입력을 보관한 뒤 다시 로그인해 주세요." };
    const project = await getProjectForOwner(client, userId, value.projectId);
    if (!project) return { kind: "conflict", message: "이 작업에 접근할 수 없습니다. 입력은 그대로 두었습니다." };
    const { data, error } = await client.from("projects").update({ title: value.title })
      .eq("id", value.projectId).eq("owner_id", userId).eq("updated_at", value.expectedProjectUpdatedAt)
      .select("id,title,updated_at").maybeSingle();
    if (error) return { kind: "error", message: "제목 저장을 확인하지 못했습니다. 입력은 그대로 두었습니다." };
    if (!data) return { kind: "conflict", message: "다른 곳에서 작업 정보가 변경되었습니다. 입력한 제목은 그대로 두었습니다." };
    if (data.id !== value.projectId || data.title !== value.title || !isTimestamp(data.updated_at)) return { kind: "error", message: "제목 저장 결과를 확인하지 못했습니다. 최신 정보를 확인해 주세요." };
    revalidatePath("/my");
    revalidatePath(`/projects/${value.projectId}`);
    return { kind: "saved", project: { title: data.title, updatedAt: data.updated_at } };
  } catch {
    return { kind: "error", message: "제목 저장 결과를 확인하지 못했습니다. 입력은 그대로 두었습니다." };
  }
}

export async function updateCreationTypeAction(input: unknown): Promise<CreationTypeResult> {
  if (!input || typeof input !== "object") return { kind: "error", message: "작품 형식을 확인해 주세요." };
  const value = input as { projectId?: unknown; creationType?: unknown; expectedProjectUpdatedAt?: unknown };
  if (!isUuid(value.projectId) || !isNullableCreationType(value.creationType) || !isTimestamp(value.expectedProjectUpdatedAt)) return { kind: "error", message: "작품 형식과 작업 정보를 확인해 주세요." };
  try {
    const client = await createSupabaseSessionClient();
    const { data: claims, error: authError } = await client.auth.getClaims();
    const userId = claims?.claims.sub;
    if (authError || !userId) return { kind: "authRequired", message: "로그인이 만료되었습니다. 입력을 보관한 뒤 다시 로그인해 주세요." };
    const project = await getProjectForOwner(client, userId, value.projectId);
    if (!project) return { kind: "conflict", message: "이 작업에 접근할 수 없습니다. 선택은 그대로 두었습니다." };
    if (project.updated_at !== value.expectedProjectUpdatedAt) return { kind: "conflict", message: "다른 곳에서 작업 정보가 변경되었습니다. 선택한 형식은 그대로 두었습니다." };
    if (project.creation_type === value.creationType) return { kind: "saved", creationType: project.creation_type, updatedAt: project.updated_at };
    const { data, error } = await client.from("projects").update({ creation_type: value.creationType })
      .eq("id", value.projectId).eq("owner_id", userId).eq("updated_at", value.expectedProjectUpdatedAt)
      .select("id,creation_type,updated_at").maybeSingle();
    if (error) return { kind: "error", message: "형식 저장을 확인하지 못했습니다. 선택은 그대로 두었습니다." };
    if (!data) return { kind: "conflict", message: "다른 곳에서 작업 정보가 변경되었습니다. 선택한 형식은 그대로 두었습니다." };
    if (data.id !== value.projectId || !isNullableCreationType(data.creation_type) || data.creation_type !== value.creationType || !isTimestamp(data.updated_at)) return { kind: "error", message: "형식 저장 결과를 확인하지 못했습니다. 최신 정보를 확인해 주세요." };
    revalidatePath("/my");
    revalidatePath(`/projects/${value.projectId}`);
    return { kind: "saved", creationType: data.creation_type, updatedAt: data.updated_at };
  } catch {
    return { kind: "error", message: "형식 저장 결과를 확인하지 못했습니다. 선택은 그대로 두었습니다." };
  }
}

export async function reloadProjectContextAction(projectId: unknown) {
  if (!isUuid(projectId)) return null;
  const client = await createSupabaseSessionClient();
  const { data, error } = await client.auth.getClaims();
  if (error || !data?.claims.sub) return null;
  return getProjectForOwner(client, data.claims.sub, projectId);
}
export async function createUnitAction(input: unknown): Promise<import("@/lib/manuscriptTypes").UnitCreateResult> {
  if (!input || typeof input !== "object") return { kind: "error", message: "원고 생성 정보를 확인해 주세요." };
  const request = input as Partial<import("@/lib/manuscriptTypes").UnitCreateRequest>;
  if (!isUuid(request.projectId) || !isUuid(request.unitId) || !isUuid(request.requestId) || !Number.isInteger(request.expectedStructureRevision) || Number(request.expectedStructureRevision) < 0 || Number(request.expectedStructureRevision) > 2147483647) return { kind: "error", message: "원고 생성 정보를 확인해 주세요." };
  try {
    const client = await createSupabaseSessionClient();
    const { data: claims, error: authError } = await client.auth.getClaims();
    if (authError || !claims?.claims.sub) return { kind: "authRequired", message: "로그인이 만료되었습니다. 다시 로그인해 주세요." };
    if (!await getProjectForOwner(client, claims.claims.sub, request.projectId)) return { kind: "error", message: "이 작업에 접근할 수 없습니다." };
    const { data, error } = await client.rpc("zaggas_create_manuscript_unit", {
      p_project_id: request.projectId, p_unit_id: request.unitId,
      p_expected_structure_revision: request.expectedStructureRevision, p_request_id: request.requestId,
    });
    if (error) return { kind: "unknown", message: "생성 결과를 확인하지 못했습니다. 같은 요청으로 다시 확인해 주세요." };
    if (data?.status === "conflict") return { kind: "conflict", message: "원고 구성이 변경되었습니다. 최신 목록을 확인한 뒤 다시 시작해 주세요." };
    if ((data?.status !== "created" && data?.status !== "existing_retry") || data.unit?.id !== request.unitId || data.unit?.project_id !== request.projectId || data.unit?.deleted_at !== null || data.unit?.creation_request_id !== request.requestId || data.unit?.creation_expected_structure_revision !== request.expectedStructureRevision) return { kind: "unknown", message: "생성 결과를 확인하지 못했습니다. 같은 요청으로 다시 확인해 주세요." };
    revalidatePath("/my"); revalidatePath(`/projects/${request.projectId}`);
    return { kind: data.status, unitId: data.unit.id };
  } catch { return { kind: "unknown", message: "생성 결과를 확인하지 못했습니다. 같은 요청으로 다시 확인해 주세요." }; }
}
