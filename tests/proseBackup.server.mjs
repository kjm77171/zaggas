import http from 'node:http';
import fs from 'node:fs';
import ts from 'typescript';
const sources = new Map([
  ['/proseAutosave.js', new URL('../src/lib/proseAutosave.ts', import.meta.url)],
  ['/proseBackup.js', new URL('../src/lib/proseBackup.ts', import.meta.url)],
  ['/proseSession.js', new URL('../src/lib/proseSession.ts', import.meta.url)],
  ['/proseLogout.js', new URL('../src/lib/proseLogout.ts', import.meta.url)],
]);
http.createServer((request, response) => {
  if (sources.has(request.url)) {
    const result = ts.transpileModule(fs.readFileSync(sources.get(request.url), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText.replaceAll('"./proseAutosave"', '"/proseAutosave.js"').replaceAll('"./proseBackup"', '"/proseBackup.js"').replaceAll('"./proseSession"', '"/proseSession.js"');
    response.writeHead(200, { 'content-type': 'text/javascript', 'cache-control': 'no-store' }); response.end(result); return;
  }
  if (request.url !== '/') { response.writeHead(404); response.end(); return; }
  response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
  response.end(fs.readFileSync(new URL('./proseBackup.browser.html', import.meta.url)));
}).listen(3001, '127.0.0.1', () => console.log('E2 local harness: http://127.0.0.1:3001'));
