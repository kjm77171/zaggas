export const autosaveDelay = 800;
export type SaveSnapshot = Readonly<{ projectId: string; unitId: string; content: string | null; expectedRevision: number; requestId: string }>;
export type ConfirmedProse = { content: string | null; revision: number };
export type ProseResult = { status: "saved" | "noop" | "existing_retry" | "conflict"; current: ConfirmedProse } | { status: "error" | "unknown"; message: string };
export type SavePhase = "CLEAN" | "DIRTY" | "SAVING" | "ERROR" | "CONFLICT" | "RESULT_UNKNOWN";
export type ProseBackup = { userId: string; projectId: string; unitId: string; backupId: string; content: string; contentFormat: "PROSE"; baseRevision: number; confirmedContent: string | null; conflicted: boolean; pending: SaveSnapshot | null; timestamp: number };
export const normalizeProse = (text: string | null) => text === null || !text.trim() ? null : text;
export function validProse(text: unknown): text is string | null {
  return text === null || (typeof text === "string" && !text.includes("\u0000") && Array.from(text).length <= 100000 && new TextEncoder().encode(text).length <= 1048576);
}
export class ProseAutosave {
  draft: string;
  confirmed: ConfirmedProse;
  phase: SavePhase = "CLEAN";
  pending: SaveSnapshot | null = null;
  message = "";
  backupFailed = false;
  composing = false;
  blocked = true;
  inFlight = false;
  disposed = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private lastInput = 0;
  private backupTimer: ReturnType<typeof setTimeout> | null = null;
  private backupQueue: Promise<void> = Promise.resolve();
  constructor(readonly identity: { userId: string; projectId: string; unitId: string; backupId: string }, initial: ConfirmedProse, private send: (snapshot: SaveSnapshot) => Promise<ProseResult>, private write: (backup: ProseBackup) => Promise<void>, private notify: () => void) {
    this.confirmed = initial; this.draft = initial.content ?? "";
  }
  get unconfirmed() { return this.blocked || this.phase === "CONFLICT" || this.pending !== null || normalizeProse(this.draft) !== this.confirmed.content; }
  private emit() { if (!this.disposed) this.notify(); }
  private cancel() { if (this.timer) clearTimeout(this.timer); this.timer = null; }
  backup() {
    const record: ProseBackup = { ...this.identity, content: this.draft, contentFormat: "PROSE", baseRevision: this.confirmed.revision, confirmedContent: this.confirmed.content, conflicted: this.phase === "CONFLICT", pending: this.pending, timestamp: Date.now() };
    this.backupQueue = this.backupQueue.then(() => this.disposed ? undefined : this.write(record)).then(() => { this.backupFailed = false; }, () => { this.backupFailed = true; }).then(() => this.emit());
    return this.backupQueue;
  }
  activate(backup?: ProseBackup) {
    this.blocked = false;
    if (backup) { this.draft = backup.content; this.pending = backup.pending ? Object.freeze({ ...backup.pending }) : null; this.lastInput = Date.now(); }
    this.phase = this.pending ? "RESULT_UNKNOWN" : normalizeProse(this.draft) === this.confirmed.content ? "CLEAN" : "DIRTY";
    if (backup && !this.pending && (backup.conflicted || (backup.baseRevision !== this.confirmed.revision && normalizeProse(this.draft) !== this.confirmed.content))) { this.phase = "CONFLICT"; this.message = "로컬 글의 기준 저장본이 변경되었습니다. 자동으로 덮어쓰지 않습니다."; }
    void this.backup(); this.schedule(); this.emit();
  }
  input(text: string) {
    this.draft = text; this.lastInput = Date.now(); this.cancel();
    if (!this.blocked && !this.inFlight && !this.pending && this.phase !== "CONFLICT") this.phase = normalizeProse(text) === this.confirmed.content ? "CLEAN" : "DIRTY";

    if (this.backupTimer) clearTimeout(this.backupTimer);
    this.backupTimer = setTimeout(() => { this.backupTimer = null; void this.backup(); }, 100);
    this.schedule(); this.emit();
  }
  composition(active: boolean) { this.composing = active; this.cancel(); if (!active) { this.lastInput = Date.now(); this.schedule(); } }
  private schedule() {
    this.cancel();
    if (this.disposed || this.blocked || this.composing || this.inFlight || this.pending || this.phase === "CONFLICT" || this.phase === "ERROR" || this.phase === "RESULT_UNKNOWN" || normalizeProse(this.draft) === this.confirmed.content) return;
    this.timer = setTimeout(() => { void this.flush(); }, Math.max(0, autosaveDelay - (Date.now() - this.lastInput)));
  }
  async flush() {
    this.cancel();
    if (this.disposed || this.blocked || this.composing || this.inFlight || this.phase === "CONFLICT") return;
    if (!this.pending) {
      if (normalizeProse(this.draft) === this.confirmed.content) { this.phase = "CLEAN"; this.emit(); return; }
      if (!validProse(this.draft)) { this.phase = "ERROR"; this.message = "원고는 100,000자와 1 MiB 이내로 작성해 주세요. 입력은 유지됩니다."; this.emit(); return; }
      this.pending = Object.freeze({ projectId: this.identity.projectId, unitId: this.identity.unitId, content: normalizeProse(this.draft), expectedRevision: this.confirmed.revision, requestId: crypto.randomUUID() });
    }
    const snapshot = this.pending;
    this.inFlight = true; this.phase = "SAVING"; this.message = ""; this.emit();
    await this.backup();
    if (this.disposed) { this.inFlight = false; return; }
    let result: ProseResult;
    try { result = await this.send(snapshot); } catch { result = { status: "unknown", message: "저장 결과를 확인하지 못했습니다. 같은 요청으로 다시 확인해 주세요." }; }
    this.inFlight = false;
    if (this.disposed) return;
    if (result.status === "unknown") { this.phase = "RESULT_UNKNOWN"; this.message = result.message; }
    else if (result.status === "error") { this.pending = null; this.phase = "ERROR"; this.message = result.message; }
    else if (result.status === "conflict") { this.pending = null; this.phase = "CONFLICT"; this.message = "다른 곳에서 이 원고가 변경되었습니다. 입력한 글은 그대로 보관됩니다."; }
    else if ("current" in result) {
      this.confirmed = result.current; this.pending = null;
      this.phase = normalizeProse(this.draft) === this.confirmed.content ? "CLEAN" : "DIRTY";
      this.message = "";
    }
    await this.backup(); this.emit(); this.schedule();
  }
  async useServer(current: ConfirmedProse) {
    if (this.inFlight || this.pending) return;
    this.cancel(); this.confirmed = current; this.draft = current.content ?? ""; this.phase = "CLEAN"; this.message = ""; this.blocked = false;
    await this.backup(); this.emit();
  }
  async stopForLogout() { this.dispose(); await this.backupQueue; }
  dispose() { this.disposed = true; this.cancel(); if (this.backupTimer) clearTimeout(this.backupTimer); }
}
