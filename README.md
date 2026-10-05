# ZAGGAS

Be real. Be human.
Simple outside. Deep inside.

TEXT 중심 Story IP Platform입니다. 현재는 로그인 사용자의 private Writing Workspace를 제공합니다.

## 환경 및 실행

Windows x64, Node.js 24 LTS, npm 11. 프로젝트 루트에서 실행합니다.

```powershell
npm.cmd install
npm.cmd run dev
```

http://localhost:3000/my 에서 Project를 선택하고 원고를 이어 씁니다.
PowerShell 실행 정책을 변경할 필요는 없습니다.

## Supabase 설정

`.env.example`을 `.env.local`로 복사한 뒤 직접 값을 입력합니다. 실제 값은 Git이나 채팅에 공유하지 않습니다.

- `SUPABASE_URL`: 프로젝트 Connect 대화상자의 Project URL.
- `SUPABASE_SECRET_KEY`: Settings > API Keys의 Secret key (`sb_secret_` 계열).

환경변수 변경 후 개발 서버를 재시작합니다.
DB 조회가 성공한 경우에만 빈 목록을 표시하며, 설정 누락과 DB 오류는 오류 화면으로 처리합니다.
`supabase/migrations/`는 schema 정의를 보관합니다. 이미 적용한 migration은 다시 실행하지 않습니다.

## Workspace / Focus — DAY05 E1 / E2

Application 원고 조회 기준은 manuscript_units입니다. 기존 stories는 legacy 데이터로 보존하며 신규 흐름에서 조회·저장하지 않습니다. 사용자 확인에 따르면 00003 schema와 00004 backfill이 Remote에 적용·검증되었습니다. migration을 다시 실행하지 않습니다.

/my의 작품 제목은 /projects/[id] Workspace로 이동합니다. 이어 쓰기는 같은 Project의 활성 last_written_unit_id가 확인되면 /projects/[id]/write/[unitId] Focus로 이동하고, 유효한 pointer가 없으면 Workspace로 이동합니다. 정렬은 last_writing_at DESC NULLS LAST이며 생성 시각과 id로 순서를 안정화합니다.

Workspace는 제목·명시적 Creation Type·이야기의 출발점·활성 원고 목록·이야기의 방향을 제공합니다. 본문 textarea와 legacy Story 수동 저장은 제공하지 않습니다. 제목 미정에서도 첫 Unit을 만들 수 있으며, 생성은 사용자 session의 zaggas_create_manuscript_unit RPC만 사용합니다. request ID와 expected structure revision을 유지하고 결과 불명 시 같은 요청을 재사용합니다.

Focus는 PROSE 원고를 편집하고 Autosave와 IndexedDB 임시 복구 백업을 제공합니다. SCREENPLAY_BLOCKS는 읽기 전용이며 편집은 보류합니다. Unit.content_format으로 PROSE/SCREENPLAY_BLOCKS를 선택하며 Project 형식만으로 원고를 변환하지 않습니다. Global Header와 가짜 AI/Publish/저장 UI는 표시하지 않습니다.

제목·형식은 Project metadata로 유지하며 updated_at 기반 optimistic UPDATE를 사용합니다. 같은 형식 선택은 no-op이고 NULL도 유효합니다. Story Direction은 기존 Explicit Save와 owner RLS 계약을 유지합니다. writing activity와 metadata 시각은 분리합니다.

## 보안 및 배포

Workspace는 사용자 session과 owner_id 기반 RLS로 접근하며 privileged Supabase client를 사용하지 않습니다.
개발 서버는 localhost에 바인딩합니다. 외부 공개·터널 공유를 하지 않습니다.
Workspace는 private 창작 공간이며 게시 또는 공개 읽기 기능을 제공하지 않습니다.
Production build 통과는 공개 CRUD 배포 가능을 의미하지 않습니다.
`main`은 Next.js 개발용이며 GitHub Pages는 독립 `pages` branch의 정적 WIP 페이지만 배포합니다.

## 검증

```powershell
npm.cmd run lint
npm.cmd run build
git diff --check
```

DAY 01 브라우저 CRUD, 새로고침 유지, 시간 갱신, 입력 검증, 404, 테스트 작품 삭제를 검증했습니다.

## DAY 02 First Experience

홈에서 시작 → 관심 복수 선택 → 가능성 → 한 문장 작성 → 내 문장과 고정 질문 확인을 제공합니다.
아직 모르겠어요는 다른 관심 선택과 함께 선택할 수 없습니다.
단계·선택·입력은 같은 탭의 새로고침에서 복원하며, 브라우저 저장소를 사용할 수 없으면 메모리 상태로 동작합니다. 영구 저장은 아닙니다.
실제 AI는 아직 연결하지 않습니다. Kakao Auth 설정 후 첫 문장을 Project로 저장할 수 있습니다. 원고 작성은 `/my`에서 Project Workspace로 이어집니다.

## DAY 02 Kakao Auth

Auth에는 @supabase/ssr의 쿠키 기반 PKCE session client를 사용합니다.
.env.local에 NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY를 직접 입력합니다.
Secret key를 public 변수에 넣지 않습니다. 기존 Secret 환경변수는 보존하지만 Workspace application에서는 사용하지 않습니다.

Supabase Authentication > Sign In / Providers > Kakao에 REST API key와 Client Secret을 설정합니다.
Allow users without an email을 활성화하고, Kakao에는 Supabase가 표시한 callback URI를 등록합니다.
Authentication > URL Configuration의 Site URL은 http://localhost:3000,
Redirect URL은 http://localhost:3000/auth/callback입니다. GitHub Pages 도메인은 Auth callback으로 사용하지 않습니다.
Kakao OAuth는 queryParams.scope로 profile_nickname,profile_image만 명시적으로 요청하며 account_email은 요청하지 않습니다.

홈의 Conversion에서 카카오로 시작하기를 누르면 같은 탭에서 로그인합니다.
/auth/callback에서 code를 교환하고 /auth/complete에서 draft를 인계합니다.
RPC는 사용자 session으로 호출하며 guest_messages는 빈 배열입니다.
DB 저장과 소유권 조회가 성공한 후에만 sessionStorage 초안을 지웁니다.
/my는 사용자 RLS로 Project를 조회합니다. 로그아웃은 현재 브라우저 session을 종료합니다.
기존 `/stories` privileged 개발 CRUD는 DAY04 Workspace 도입과 함께 종료했습니다.

## DAY05 CREATE 저장 계약과 다음 단계

DAY04 Story Direction MVP와 Visual Grammar v1은 commit/push를 마쳤습니다.
E1에서 Unit 조회·생성·Workspace/Focus route를 구현했습니다. E1 첫 Unit 생성과 NULL 제목 runtime 검증을 완료했고, E2에서 PROSE Focus 편집과 Autosave·IndexedDB 백업/복원을 구현했습니다.

목표 동선은 작품 선택 → Workspace, 이어 쓰기 → Focus Editor입니다. 제목 없이 빈 Unit을 만들 수 있고, 원고는 Unit별 Autosave와 local backup으로 보호합니다. Direction은 기존 Explicit Save를 유지합니다.
Project creation_type과 Unit content_format을 분리하고 기존 본문을 자동 변환하지 않습니다. 실제 원고 변경만 writing activity로 기록합니다. Save와 Publish는 분리합니다.

상세 저장 계약·초기 기술 안전 한도·legacy 전환·검증 항목은 [DAY05 저장 계약](docs/day05-manuscript-data-contract.md)에 있습니다.
사용자가 Remote preflight에서 Projects 32건, Stories 8건과 정상 연결을 확인했습니다. 다음 두 파일은 사용자가 Remote에 적용하고 검증을 완료했습니다.

1. `supabase/migrations/20261005000003_add_manuscript_unit_contract.sql`: schema, constraints, RLS, Project metadata trigger, RPC.
2. `supabase/migrations/20261005000004_backfill_legacy_story_units.sql`: 기존 Story 8건을 원문·시각 그대로 PROSE Unit으로 복사하고 Project writing activity를 설정합니다. 기존 Story는 수정·삭제하지 않습니다.

적용 완료된 migration은 재실행하지 않습니다. E1에서는 application을 Unit 기반으로 전환했으며 legacy Story 쓰기를 재개하지 않습니다. E1 구현 작업 중 Remote SQL/DML은 실행하지 않았습니다. 계약 문서는 STEP C 작성 당시의 검토 상태를 포함하며 현재 구현 상태는 위 E1 / E2 절을 기준으로 합니다.

### E2 PROSE Focus

원고 조회와 저장 기준은 manuscript_units입니다. PROSE는 plain-text textarea로 편집하고 800ms debounce 후 zaggas_save_prose_unit을 사용자 session으로 호출합니다. 저장 snapshot은 고정하며 Unit 편집 경계에서 한 요청만 진행합니다. 이후 입력은 server-confirmed revision으로 이어 저장합니다. 결과 불명 재시도는 원래 content/expectedRevision/requestId를 유지하며, conflict에서는 입력을 보존하고 자동 저장을 멈춥니다. 한국어 IME 조합 중에는 snapshot을 만들지 않습니다.

IndexedDB 백업은 userId/projectId/unitId와 탭별 backupId로 구분합니다. 입력 후 100ms 백업과 서버 요청 전 pending snapshot 백업을 수행합니다. 백업은 7일 유효하며 접근 시 만료 데이터를 정리합니다. 복원은 사용자 선택이며, pending 요청은 동일 요청 확인 전 새로운 저장을 시작하지 않습니다. 충돌 백업은 재진입 후에도 자동 저장하지 않습니다. 로그아웃 전 미확인 원고가 있으면 ‘돌아가서 확인’과 ‘로그아웃하고 삭제’를 제공합니다. 정상 또는 명시적 삭제 로그아웃은 해당 계정 백업만 삭제합니다. 공용 기기 안내는 복구·오류·로그아웃 상황에서만 표시합니다. 로컬 백업은 서버 저장 성공을 의미하지 않으며, 백업 실패 시 화면에 안내합니다.

내부 링크 이동은 미확인 글 안내와 백업 완료를 거치며 beforeunload도 보호합니다. Browser Back dirty protection은 신뢰할 수 있는 router-level guard 도입까지 보류합니다. SCREENPLAY_BLOCKS는 읽기 전용이며 실제 저장 문법을 Project 형식만으로 변환하지 않습니다. Screenplay 편집·AI·Publish·원고 제목 편집은 구현하지 않았습니다.

계약 테스트: `node --test tests/proseAutosave.test.mjs`.
Native IndexedDB 검증은 `node tests/proseBackup.server.mjs` 실행 후 `http://127.0.0.1:3001/`에서 수행합니다. 독립된 로컬 테스트 origin의 가짜 계정만 사용하며 제품 route와 Remote DB를 변경하지 않습니다. 테스트 server는 검증 후 종료합니다.
### E1 / E2 최종 검증 상태

E1: COMPLETE. E2: 승인된 PROSE 구현과 계약 테스트·실제 Autosave 검증 COMPLETE. 이번 finalize 이후 사용자 화면 확인과 Git 마무리는 별도 진행합니다.
실제 저장은 revision 0→1(46자), 이후 revision 2(60자)를 확인했습니다. writing pointer와 Project metadata 보존, Story 8건·legacy Unit 8건 보존을 확인했습니다. structure revision 1→2는 사용자가 두 번째 Unit을 생성한 정상적인 구조 변경이며 본문 Autosave 때문이 아닙니다.
Browser Back dirty guard, SCREENPLAY_BLOCKS 편집, AI, Publish는 미구현/보류입니다. 실제 한국어 IME·로그아웃 경고 UI의 사용자 확인은 별도로 진행하며 자동 계약 테스트로 이를 대체했다고 기록하지 않습니다.
