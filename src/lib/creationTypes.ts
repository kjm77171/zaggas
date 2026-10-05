export const creationTypes = [
  { code: "SCREENPLAY", label: "시나리오", description: "장면과 대사로 펼치는 이야기" },
  { code: "NOVEL", label: "소설", description: "인물과 서술로 이어가는 이야기" },
  { code: "WEB_NOVEL", label: "웹소설", description: "회차를 이어가며 펼치는 이야기" },
  { code: "ESSAY", label: "에세이", description: "생각과 경험을 담아내는 글" },
] as const;
export type CreationType = typeof creationTypes[number]["code"];
export function isCreationType(value: unknown): value is CreationType {
  return creationTypes.some(item => item.code === value);
}
export function isNullableCreationType(value: unknown): value is CreationType | null {
  return value === null || isCreationType(value);
}
