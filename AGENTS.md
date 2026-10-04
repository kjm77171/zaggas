# ZAGGAS 작업 규칙

## 작업 영역
- 유일한 작업 영역은 이 AGENTS.md가 위치한 ZAGGAS Repository 루트와 그 내부이다.
- 프로젝트 외부 파일을 수정하지 않는다. 회사 프로젝트(TLS, Seedgen, mcp-admin 등)에 접근하거나 소스·설정을 참조·복사·수정하지 않는다.
- 회사 Repository, Remote, Branch, Credential 및 Git 설정을 변경하지 않는다.
- 시스템 전역 설치·PATH·PowerShell ExecutionPolicy 등 전역 설정을 임의 변경하지 않는다. 필요하면 이유와 영향도를 먼저 보고한다.
- 일반적인 npm 캐시를 사용하며 프로젝트 내부 강제 격리 설정을 적용하지 않는다.

## 작업 절차
- 기능 개발은 분석 → 사용자 승인 → 구현 → 검증 순서로 진행한다.
- 분석에는 요구사항, 현재 상태, 구현 방향, 영향 범위, 대상 파일, DB 변경, 외부 API 영향, 예상 결과, 검증 방법을 포함한다.
- 단순 확인·분석 요청에서는 파일을 수정하지 않는다.
- 요청 범위 밖 수정과 불필요한 리팩터링을 하지 않는다.
- 매일 TODAY GOAL, TASK, DONE을 정의하고 종료 시 목표 달성 여부를 검증한다.
- 신규 라이브러리는 추가 이유와 영향을 먼저 보고하고 승인된 범위에서만 추가한다.

## 제품과 구현
- ZAGGAS는 회사 업무와 무관한 독립된 개인 Story IP Platform이다.
- TEXT 중심 MVP를 우선한다. CREATE → PUBLISH → DISCOVER → REACT → PROVE → EXPAND 중 초기에는 작성·공개·발견·반응에 집중한다.
- 단순한 구조와 직관적인 UI를 유지하고 미래 기능을 미리 구현하지 않는다.
- 기존 코드가 있으면 구조와 패턴을 먼저 분석하고 일관성을 유지한다.
- 작품과 이야기가 먼저 발견되도록 하며 팔로워·인기 경쟁 중심 SNS를 지향하지 않는다.
- AI는 자동 작품 생성이 아닌 창작자의 생각을 발전시키는 Writing Partner 역할이다.
- Be real. Be human. / Simple outside. Deep inside.
- 비밀정보를 소스에 직접 작성하지 않는다. .env, API Key, Supabase Key를 commit하지 않는다.
- 테스트용 임시 코드를 운영 코드에 남기지 않는다.
- JavaScript/TypeScript 식별자는 영문·숫자·밑줄만 사용하고 변수·함수·로컬 객체 속성은 camelCase를 사용한다. 외부 API 이름은 보존한다.

## Git
- Git 변경 전 실제 Repository root와 Branch를 확인한다.
- 전역 user.name/user.email을 변경하지 않는다. 개인 정보는 GitHub 연결 단계에 사용자에게 받아 ZAGGAS local config에만 설정한다.
- 회사 전역 Git 사용자 정보로 ZAGGAS commit을 만들지 않는다. 개인 local config가 확정되기 전에는 commit하지 않는다.
- Commit 전 변경 파일과 diff를 확인하고 의도하지 않은 파일이 있으면 중단한다.
- .idea, node_modules, 빌드 결과물, 실제 환경변수 및 개발환경 전용 파일은 Git에서 제외한다.
- GitHub Repository/remote/push 및 Supabase 연결은 별도 승인 없이 수행하지 않는다.

## 환경과 검증
- Windows x64, Node.js v24.21.0, npm/npx 11.19.0. Codex 내장 런타임 대신 일반 설치 Node.js를 사용한다.
- PowerShell ExecutionPolicy를 변경하지 않고 필요하면 npm.cmd / npx.cmd를 사용한다.
- 완료 보고에 실제 경로, 변경 파일, 구현 기능, dev 실행, lint, production build, 테스트, 화면 확인 방법, Git 상태, DB 변경, 외부 영향, 남은 문제, 다음 작업 후보를 포함한다.
- 다음 단계 후보는 제안만 하고 임의 진행하지 않는다.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
