import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const compiled = ts.transpileModule(fs.readFileSync(new URL('../src/lib/proseAutosave.ts', import.meta.url), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const { ProseAutosave, normalizeProse, validProse } = await import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'));
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
const identity = () => ({ userId: 'user', projectId: 'project', unitId: 'unit', backupId: crypto.randomUUID() });
function make(send, initial = { content: null, revision: 0 }) {
  const backups = []; const engine = new ProseAutosave(identity(), initial, send, async record => { backups.push(structuredClone(record)); }, () => {});
  engine.activate(); return { engine, backups };
}
test('one in-flight, immutable A snapshot, newer B uses confirmed revision and new request', async () => {
  const calls = []; let release;
  const { engine } = make(request => { calls.push(request); return new Promise(resolve => { release = resolve; }); });
  engine.input('A'); const first = engine.flush(); await tick();
  engine.input('A+B'); await engine.flush(); assert.equal(calls.length, 1); assert.equal(calls[0].content, 'A'); assert.ok(Object.isFrozen(calls[0]));
  release({ status: 'saved', current: { content: 'A', revision: 1 } }); await first;
  const second = engine.flush(); await tick(); assert.equal(calls.length, 2); assert.equal(calls[1].content, 'A+B'); assert.equal(calls[1].expectedRevision, 1); assert.notEqual(calls[0].requestId, calls[1].requestId);
  release({ status: 'saved', current: { content: 'A+B', revision: 2 } }); await second; assert.equal(engine.phase, 'CLEAN'); engine.dispose();
});
test('lost response retry stays exact despite newer input and backup contains pending request', async () => {
  const calls = []; const { engine, backups } = make(async request => { calls.push(request); if (calls.length === 1) throw Error('network'); return { status: 'existing_retry', current: { content: request.content, revision: 1 } }; });
  engine.input('A'); await engine.flush(); assert.equal(engine.phase, 'RESULT_UNKNOWN'); assert.ok(backups.at(-1).pending);
  engine.input('A+B'); await engine.flush(); assert.strictEqual(calls[0], calls[1]); assert.equal(engine.draft, 'A+B'); assert.equal(engine.confirmed.revision, 1); assert.equal(engine.phase, 'DIRTY'); engine.dispose();
});
test('conflict preserves local draft and prevents automatic/manual overwrite', async () => {
  let calls = 0; const { engine } = make(async () => { calls++; return { status: 'conflict', current: { content: 'remote', revision: 5 } }; });
  engine.input('local'); await engine.flush(); engine.input('local continued'); await engine.flush(); assert.equal(calls, 1); assert.equal(engine.phase, 'CONFLICT'); assert.equal(engine.draft, 'local continued'); assert.equal(engine.confirmed.revision, 0); assert.equal(engine.unconfirmed, true); engine.dispose();
});
test('semantic empty content skips saves and leaves local whitespace unchanged', async () => {
  let calls = 0; const { engine } = make(async () => { calls++; throw Error(); }); engine.input(' \n\t'); await engine.flush(); assert.equal(engine.draft, ' \n\t'); assert.equal(engine.phase, 'CLEAN'); assert.equal(calls, 0); engine.dispose();
});
test('IME holds snapshots until composition ends; 800ms debounce saves final text', async () => {
  const calls = []; const { engine } = make(async request => { calls.push(request); return { status: 'saved', current: { content: request.content, revision: 1 } }; });
  engine.composition(true); engine.input('ㅎ'); await new Promise(resolve => setTimeout(resolve, 900)); await engine.flush(); assert.equal(calls.length, 0);
  engine.input('한글'); engine.composition(false); await new Promise(resolve => setTimeout(resolve, 900)); assert.equal(calls.length, 1); assert.equal(calls[0].content, '한글'); engine.dispose();
});
test('re-entry restores unknown snapshot without new request ID; stale local restore conflicts', async () => {
  const request = Object.freeze({ projectId: 'project', unitId: 'unit', content: 'A', expectedRevision: 0, requestId: crypto.randomUUID() });
  const row = { ...identity(), content: 'A+B', contentFormat: 'PROSE', baseRevision: 0, confirmedContent: null, pending: request, timestamp: Date.now() };
  const { engine } = make(async received => { assert.deepEqual(received, request); return { status: 'existing_retry', current: { content: 'A', revision: 1 } }; }, { content: 'A', revision: 1 });
  engine.activate(row); assert.equal(engine.phase, 'RESULT_UNKNOWN'); await engine.flush(); assert.equal(engine.draft, 'A+B'); assert.equal(engine.confirmed.revision, 1); engine.dispose();
  const { engine: stale } = make(async () => { throw Error('must not save'); }, { content: 'new server', revision: 5 }); stale.activate({ ...row, pending: null }); assert.equal(stale.phase, 'CONFLICT'); await stale.flush(); stale.dispose();
});
test('unmounted Unit does not start queued saves or rewrite backup after late response', async () => {
  let release; const { engine, backups } = make(() => new Promise(resolve => { release = resolve; })); engine.input('A'); const pending = engine.flush(); await tick(); engine.dispose(); const length = backups.length;
  release({ status: 'saved', current: { content: 'A', revision: 1 } }); await pending; assert.equal(backups.length, length);
});
test('Unicode, size and NUL limits align with prose boundary', () => {
  assert.equal(normalizeProse('\u00a0\u3000'), null); assert.equal(normalizeProse(' x \n'), ' x \n'); assert.equal(validProse('😀'.repeat(100000)), true); assert.equal(validProse('😀'.repeat(100001)), false); assert.equal(validProse('a\u0000b'), false);
});

test('conflict backup remains paused even if server revision now equals its base', async () => {
  const { engine } = make(async () => { throw Error('must not send'); }, { content: 'remote', revision: 5 });
  engine.activate({ ...identity(), content: 'local', contentFormat: 'PROSE', baseRevision: 5, confirmedContent: 'remote', conflicted: true, pending: null, timestamp: Date.now() });
  assert.equal(engine.phase, 'CONFLICT'); await engine.flush(); assert.equal(engine.draft, 'local'); engine.dispose();
});
