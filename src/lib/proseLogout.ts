"use client";
import { clearProseBackups, hasUnconfirmedProseBackup } from "./proseBackup";
import { inspectActiveProse, stopAccountProse } from "./proseSession";
export async function logoutWithDrafts(userId: string, confirmed: boolean, signOut: () => Promise<void>) {
  if (!confirmed && (await inspectActiveProse(userId) || await hasUnconfirmedProseBackup(userId))) return "confirmation_required" as const;
  await stopAccountProse(userId);
  await clearProseBackups(userId);
  await signOut();
  return "signed_out" as const;
}
