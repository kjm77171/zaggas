"use client";
import type { ProseBackup } from "./proseAutosave";
import { validProse, normalizeProse } from "./proseAutosave";
const retention = 7 * 24 * 60 * 60 * 1000;
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("zaggas-private-drafts", 1);
    request.onupgradeneeded = () => { const store = request.result.createObjectStore("prose", { keyPath: ["userId", "projectId", "unitId", "backupId"] }); store.createIndex("userId", "userId"); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("로컬 백업을 사용할 수 없습니다."));
    request.onblocked = () => reject(new Error("다른 탭의 로컬 백업을 확인해 주세요."));
  });
}
async function records(userId: string): Promise<ProseBackup[]> {
  const db = await database();
  try { return await new Promise((resolve, reject) => { const tx = db.transaction("prose", "readonly"); const req = tx.objectStore("prose").index("userId").getAll(userId); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); }); } finally { db.close(); }
}
export async function writeProseBackup(record: ProseBackup) {
  const db = await database();
  try { await new Promise<void>((resolve, reject) => { const tx = db.transaction("prose", "readwrite"); tx.objectStore("prose").put(record); tx.oncomplete = () => resolve(); tx.onabort = () => reject(tx.error); tx.onerror = () => reject(tx.error); }); } finally { db.close(); }
}
export async function readProseBackups(userId: string, projectId: string, unitId: string) {
  const all = await records(userId);
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => { const tx = db.transaction("prose", "readwrite"); for (const row of all) if (row.timestamp < Date.now() - retention) tx.objectStore("prose").delete([row.userId, row.projectId, row.unitId, row.backupId]); tx.oncomplete = () => resolve(); tx.onabort = () => reject(tx.error); });
  } finally { db.close(); }
  return all.filter(row => row.projectId === projectId && row.unitId === unitId && row.contentFormat === "PROSE" && typeof row.content === "string" && validProse(row.content) && row.timestamp >= Date.now() - retention && Number.isInteger(row.baseRevision) && row.baseRevision >= 0 && (!row.pending || (row.pending.projectId === projectId && row.pending.unitId === unitId && validProse(row.pending.content) && Number.isInteger(row.pending.expectedRevision) && row.pending.expectedRevision >= 0 && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(row.pending.requestId)))).sort((a, b) => b.timestamp - a.timestamp);
}
export async function clearProseBackups(userId: string) {
  const all = await records(userId); const db = await database();
  try { await new Promise<void>((resolve, reject) => { const tx = db.transaction("prose", "readwrite"); for (const row of all) tx.objectStore("prose").delete([row.userId, row.projectId, row.unitId, row.backupId]); tx.oncomplete = () => resolve(); tx.onabort = () => reject(tx.error); }); } finally { db.close(); }
}
export async function hasUnconfirmedProseBackup(userId: string) {
  return (await records(userId)).some(row => row.timestamp >= Date.now() - retention && (row.conflicted || row.pending !== null || normalizeProse(row.content) !== row.confirmedContent));
}

export async function discardProseBackup(record: ProseBackup) {
  const db = await database();
  try { await new Promise<void>((resolve, reject) => { const tx = db.transaction("prose", "readwrite"); tx.objectStore("prose").delete([record.userId, record.projectId, record.unitId, record.backupId]); tx.oncomplete = () => resolve(); tx.onabort = () => reject(tx.error); }); } finally { db.close(); }
}