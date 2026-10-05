# DAY05 Manuscript 저장 계약

상태: 00003 schema와 00004 legacy backfill은 사용자가 Remote 적용·검증을 완료했다. E1 COMPLETE. E2 PROSE 구현·계약 및 실제 Autosave 검증 COMPLETE. 최종 사용자 화면 확인과 Git 마무리는 별도 단계이다.
기준 HEAD: 356c8f2241ae5a0a0a7328d646ba790cb395b823.

## 오늘 목표와 완료 조건

TODAY GOAL: 제목 없는 Unit 작성과 안전한 Autosave로 이어지는 저장 계약을 준비한다.
TASK: 확인된 Remote baseline을 반영한 schema/RPC 최종화, 별도 legacy backfill, 정적 검토와 검증 SQL 준비.
DONE: 승인된 원칙과 초안이 일치하고 미결정 사항·runtime 미검증 범위를 명시한다. DB 적용과 UI 구현 완료를 뜻하지 않는다.

## 현재 동작과 이전 계약 구분

이전 DAY04 application은 Project당 0/1 Story, 수동 저장, 제목 없는 첫 저장의 제목 결정, content-only timestamp UPDATE를 사용한다. 여러 Story는 임의 선택하지 않는다. /stories CRUD route는 404이며 privileged client는 제거됐다.
현재 DAY05 application은 Project → Unit이며 별도 manuscripts 테이블을 만들지 않는다. 작품 선택은 Workspace, 이어 쓰기는 최근 활성 Unit의 Focus Editor이다. Focus route는 /projects/[id]/write/[unitId]이다.
Direction Explicit Save와 기존 Auth/onboarding은 유지한다. 빈 Unit·NULL Project title·NULL creation_type도 작성 가능하다.

## schema

- manuscript_units: UUID PK, project_id FK, bigint position, nullable title/content, content_format, integer revision, last_request_id, deleted_at, source_story_id, 생성 요청 추적값, 생성/수정 시각.
- content_format은 PROSE / SCREENPLAY_BLOCKS. 신규 기본값만 Project creation_type에서 결정한다. 기존 Unit은 현재 format으로 열며 형식 변경만으로 변환하지 않는다.
- title은 NULL 또는 공백이 아닌 200 code points 이하. title 수정 RPC는 아직 만들지 않는다.
- PROSE 빈 값·공백-only 입력은 저장 경계에서 NULL로 통일한다. 의미 있는 원문의 앞뒤 공백·줄바꿈은 보존한다. 신규 schema CHECK는 legacy 복사 원문을 보존할 수 있게 공백-only 자체를 금지하지 않는다.
- SCREENPLAY_BLOCKS Unit의 content는 항상 NULL이다. 0 Blocks도 정상이다.
- revision은 빈 신규 Unit에서 0, 실제 snapshot 변경마다 +1. 새 Unit creation_request_id는 필수이며 본문 저장 last_request_id와 독립적으로 유지한다.
- source_story_id는 UNIQUE 추적값이며 legacy 삭제로 값이 지워지는 FK를 두지 않는다. legacy 복사는 source_story_id만 사용하고 생성 요청 컬럼은 NULL이다. runtime 생성은 source_story_id가 NULL이고 생성 요청 컬럼이 필수이다. 두 경로는 CHECK로 구분한다.
- creation_request_id와 creation_expected_structure_revision은 생성 재시도를 위한 기술 컬럼이다. 저장 후에도 같은 생성 요청으로 두 번째 Unit을 만들지 않는다.
- 활성 (project_id, position)에 partial UNIQUE index를 둔다. soft-deleted Unit은 같은 position 사용을 막지 않는다. append는 1000 단위이며 bigint overflow는 실패로 처리한다.
- screenplay_blocks는 UUID PK, unit_id, position, 허용 block_type, nullable content, 시각을 가진다. 배열 순서에서 position을 서버가 계산한다. Block별 revision은 없다.
- Block의 content_format 기술 컬럼과 (unit_id, content_format) 복합 FK는 Prose Unit 아래 Block 생성을 DB에서 차단한다. client payload에는 이 기술 컬럼을 받지 않는다.

## Project 상태

- last_writing_at / last_written_unit_id는 함께 NULL 또는 함께 존재한다.
- (Project id, last_written_unit_id) 복합 FK로 같은 Project 소속을 보장한다. 활성 여부는 RLS/조회, 저장 RPC와 향후 삭제 RPC가 확인한다. CHECK만으로 deleted_at을 다른 테이블에서 검사하지 않는다.
- manuscript_structure_revision은 0부터 시작하고 Unit 생성마다 +1. 본문 저장은 이 값을 변경하지 않는다.
- 실제 원고 변경 성공만 writing activity를 갱신한다. 빈 Unit 생성, noop, retry, conflict, metadata/Direction/순서 변경은 갱신하지 않는다. 비어 있던 내용과 다른 내용의 저장 및 기존 내용 비우기도 실제 원고 변경이다.
- 비어 있는 Block 하나 추가/종류 변경도 Scene snapshot 구조 변경이다. 0 Blocks와 동일한 상태로 취급하지 않는다. 각 Block의 공백-only content는 NULL로 통일한다. 이 의미를 Editor UX 검토에서 재확인한다.
- 제목·형식 편집의 기존 Project.updated_at 계약을 유지하면서 activity와 구조 revision 업데이트를 제외하도록 Project 전용 trigger를 제안한다. updated_at은 metadata 시각으로 정의하며 일반 activity 시각으로 쓰지 않는다.
- 기존 Story/Profile trigger helper는 수정하지 않는다. Project trigger 이름은 유지하고 함수만 신규 전용 함수로 교체한다. 현재 title/type optimistic UPDATE 코드가 activity 때문에 충돌하지 않게 한다. metadata 변경 자체는 계속 충돌 시각을 갱신한다.
- last_written_unit_id가 삭제되거나 유효하지 않으면 활성 Unit 중 최근 수정 시각, position, id로 안정적으로 fallback한다. 없으면 Workspace로 이동한다. 삭제 RPC는 pointer와 last_writing_at 쌍 및 FK를 함께 처리해야 한다. 삭제/이동 RPC와 UI는 아직 만들지 않는다.

## Unit 생성 RPC

zaggas_create_manuscript_unit(project UUID, unit UUID, expected_structure_revision integer, request UUID) → jsonb.

- auth.uid()로 owner를 확인하고 Project → Unit 순서로 잠근다. READ COMMITTED만 허용한다.
- metadata를 받지 않는다. 현재 creation_type에서 새 Unit의 format만 결정한다.
- expected structure revision이 다르면 conflict. 성공 시 빈 Unit 생성 + structure revision 증가를 같은 transaction에서 처리한다.
- 같은 Project/request ID의 생성 이력을 먼저 확인한다. Unit ID와 최초 expected revision이 같으면 existing_retry. 이후 creation_type 변경이나 본문 저장으로 결과가 달라도 새 Unit을 생성하지 않는다.
- 생성 retry 결과의 Unit은 현재 상태다. 최초 빈 snapshot으로 local editor를 덮어쓰면 안 된다. Focus loader에서 최신 Unit/Blocks를 조회한다.
- request ID 재사용에 다른 Unit ID/expected revision을 넣으면 오류. 다른 Project와 충돌하는 UUID는 일반 오류로 처리하며 다른 소유자 정보를 출력하지 않는다.
- same-request 최초 경쟁은 Project 잠금으로 직렬화한다. 다른 요청의 오래된 structure revision은 conflict다.

## 본문 저장 RPC

- zaggas_save_prose_unit(project UUID, unit UUID, content text, expected_revision integer, request UUID).
- zaggas_save_screenplay_unit(project UUID, unit UUID, blocks jsonb, expected_revision integer, request UUID).
- 공개 wrapper 두 개는 외부 계약을 분리하며 owner/revision/activity 처리만 공통 내부 함수로 공유한다. 내부 함수는 authenticated가 직접 실행할 수 없다. 모두 jsonb를 반환한다.
- 저장 순서: owner/활성/format → payload 검증 → 동일 request ID retry → revision → same-value → 실제 변경.
- 실제 변경: Unit revision +1, last_request_id·updated_at, Project writing activity를 하나의 transaction으로 저장한다.
- saved / noop / existing_retry / conflict를 반환한다. content/Blocks를 서버 응답으로 무조건 local draft에 복사하지 않는다.
- retry는 동일 Project·Unit·format·normalized snapshot과 원래 expected revision을 요구한다. 마지막 변경 요청이 같고 expected = revision - 1이면 existing_retry. 다른 입력으로 ID를 재사용하면 오류다.
- noop은 request ID를 새로 기록하지 않고 revision/시각도 유지한다. noop 응답 유실 후 다른 탭이 변경하면 원래 retry는 conflict가 될 수 있다. 전체 요청 이력 원장을 만들지 않는다.
- 최근 요청보다 오래된 retry도 conflict가 될 수 있다. 결과 불명은 같은 요청으로 확인하며 최신 내용을 조용히 덮어쓰지 않는다.
- Scene payload는 [{id, block_type, content}, ...]. 추가 field, 중복/잘못된 UUID, 허용되지 않은 type을 차단한다. 다른 Unit Block ID를 이동시키지 않는다.
- 배열 순서와 Block ID/type/normalized content가 동일해야 noop이다. 전체 교체는 한 transaction으로 수행하며 같은 Block ID의 created_at을 유지한다. 본문/type이 같으면 Block.updated_at도 유지한다. position 변경은 Unit revision으로 관리한다.
- block 교체 이후 오류가 발생해도 예외를 성공으로 숨기지 않고 전체 RPC transaction을 실패시킨다.
- title/format/deleted_at/position/owner/revision/시각 등 임의 field를 RPC가 받아 갱신하지 않는다.

## RLS / ACL

- 활성 Unit의 SELECT는 연결 Project owner만 가능하다. Block SELECT도 같은 owner 및 활성 Unit 기준이다.
- authenticated: 두 신규 table SELECT만, 공개 RPC 세 개 EXECUTE만. 직접 INSERT/UPDATE/DELETE 없음. 내부 save helper와 trigger helper EXECUTE 없음.
- anon/PUBLIC: 신규 table 권한과 신규 RPC EXECUTE 없음.
- service_role: 신규 table 및 신규 RPC 권한을 명시적으로 부여하지 않고 자동 부여 권한을 revoke한다. BYPASSRLS가 table ACL을 대체하지 않는다. 기존 table/RPC의 trusted 권한은 바꾸지 않는다. 이 신규 경로의 최소 권한 선택은 STEP C에서도 유지한다. 기존 projects/stories의 trusted service_role 운영 모델과 의도적으로 다르다. service_role SDK를 사용하는 신규 원고 관리·복구 기능은 동작하지 않으며, 필요한 경우 별도 승인된 DB 관리자 연결과 복구 절차를 사용해야 한다. 이번 작업에서 관리자 연결을 생성하지 않는다.
- RPC는 postgres owner / SECURITY DEFINER / search_path='' 및 명시적 schema qualification이다. PUBLIC은 role 이름 문자열이 아니므로 ACL 검증에서는 grantee=0을 사용한다.
- Project 새 컬럼에 authenticated INSERT/UPDATE 권한을 추가하지 않는다. 기존 Project service_role table grant는 새 컬럼에도 영향을 주므로 preflight에 기존 ACL을 기록한다.
- SECURITY DEFINER bypass를 허용하는 것은 검증된 owner RPC 내부뿐이다. 사용자가 owner UUID를 제공하지 않는다.

## 승인된 초기 기술 안전 한도 — 최종 제품 제한 아님

STEP C에서 아래 초기 기술 안전 한도를 유지하도록 승인했다. 향후 조정할 때 CHECK와 RPC 숫자를 함께 변경해야 한다.

| 대상 | 초기 한도 | 이유 |
|---|---|---|
| Prose | 100000 code points + 1 MiB text | 기존 Story 호환 출발점, raw text 크기도 제한 |
| Block | 8000 code points | 대사/행동 입력의 비정상 단일 항목 제한 |
| Scene | 200 Blocks + 200000 total code points + 2 MiB JSONB text | 배열 반복 비용과 전체 snapshot transaction 비용 제한 |

Scene 한도는 기존 Story 100000을 그대로 복제하지 않는다. 위 값은 제품 정책이 아닌 초기 기술 안전 한도이다. JSONB text 크기는 DB에서 파싱 후 평가되며 transport의 raw body 한도를 대신하지 않는다. Server Action body size와 reverse proxy 한도는 Focus 구현 전에 함께 검토한다.

## Autosave / backup application 계약 — E2 PROSE 구현

- 초기 debounce 800ms는 한 상수로 관리한다. IME 조합 중 snapshot 생성 보류.
- Unit당 한 in-flight 요청. draft는 계속 편집 가능하며 confirmed snapshot과 분리한다.
- 결과 불명 pending snapshot/ID는 고정한다. 이후 local 입력은 보관하고 pending 확인 후 다음 저장한다.
- CONFLICT에서는 자동 저장 중단·draft 보존·최신 내용 비교. 새 request ID를 자동 발급해 충돌을 우회하지 않는다.
- IndexedDB native API, key = userId/projectId/unitId. content 또는 blocks, format, base revision, pending snapshot/ID, backup timestamp를 보관한다.
- backup 실패를 서버 저장 성공으로 오해하지 않는다. 복원은 사용자 선택이며 다른 계정의 백업을 섞지 않는다.
- IndexedDB는 임시 복구 장치이며 server-confirmed manuscript가 영구 source of truth이다. backup timestamp 기준 7일 초과 항목은 복구 후보에서 제외하고 Focus 진입 시 정리한다. 매 입력마다 전체 정리하지 않고 브라우저 종료 시 유효 백업을 삭제하지 않는다.
- key는 userId/projectId/unitId/backupId로 계정과 탭을 격리한다. 서버와 동일한 confirmed 백업은 미확인 원고가 아니다.
- 로그아웃 전 DIRTY/SAVING/ERROR/RESULT_UNKNOWN 및 서버와 다른 복구 가능한 백업을 확인한다. 미확인 원고가 있으면 ‘아직 서버에 저장되지 않은 글이 있습니다. 로그아웃하면 이 기기에 남아 있는 임시 원고도 삭제됩니다.’를 안내하고 ‘돌아가서 확인’ / ‘로그아웃하고 삭제’를 제공한다. 취소는 원고를 보존한다. 정상 또는 명시적 삭제 로그아웃은 현재 계정 백업만 삭제한 뒤 진행한다.
- 공용 기기 안내는 복구/오류/로그아웃 관련 상황에만 표시한다: ‘공용 기기에서는 사용 후 로그아웃해 주세요. 로그아웃하면 이 기기의 임시 원고가 삭제됩니다.’ 상시 배너를 표시하지 않는다.
- 인증정보와 token/secret은 저장하지 않으며 최소 userId/projectId/unitId와 복구 상태만 보관한다.
- 명시적 이동, reload/close, 브라우저 Back은 각각 검증한다. 기존 Direction의 browser Back deferred item이 자동 해결된 것으로 취급하지 않는다.

## Remote baseline과 legacy 전환

사용자가 SQL Editor에서 확인한 결과: Projects 32건, Stories 8건, Direction 4건. Story는 모두 정상 owner/project 연결이며 8개 Project에 1건씩 존재한다. 24개 Project에는 Story가 없다. 최대 본문은 60 code points / 114 bytes이다. 이는 사용자가 제공한 확인 결과이며 Codex가 Remote를 직접 조회한 결과가 아니다.

00003은 schema·constraints·Project trigger·RLS·RPC만 추가한다. 00004는 기존 Story 8건을 복사한다. 기존 적용 migration과 RPC는 수정하지 않는다.

- Unit id = Story id, position = 1000, format = PROSE, revision = 1.
- project_id/title/content/created_at/updated_at은 Story 값을 정확히 복사한다. SCREENPLAY Project의 기존 Story 1건도 PROSE로 보존하며 Blocks로 변환하지 않는다.
- source_story_id = Story id, UNIQUE. creation_request_id와 creation_expected_structure_revision은 NULL.
- last_request_id = md5('zaggas:legacy-story:' + Story UUID 문자열)를 UUID로 변환한 값. revision 1의 baseline 표식이며 사용자 저장 요청 ID가 아니다. Focus는 새로운 사용자 요청 UUID를 발급해야 한다.
- Story가 있는 8개 Project는 last_writing_at = Story.updated_at, last_written_unit_id = 복사 Unit id. 나머지 24개는 둘 다 NULL.
- 모든 Project의 manuscript_structure_revision은 0이다. 복사 자체는 runtime 구조 mutation이 아니다.
- source_story_id 충돌 시 DO NOTHING으로 중복 INSERT를 방지한다. 기존 Unit이 원문·연결·revision·시각·표식과 다르면 실패하며 덮어쓰지 않는다. 반복 적용을 정상 운영 방식으로 삼지 않는다.

00004는 제한 시간과 table lock 아래 baseline을 확인하고, 기존 Project metadata와 Story 전체 row를 transaction 내부 임시 snapshot으로 보관한다. 복사 후 전체 비교가 다르면 실패한다. 임시 snapshot은 COMMIT 때 삭제되며 파일이나 로그에 본문을 출력하지 않는다. 기존 Story UPDATE/DELETE와 dual-write는 없다.

00003의 Project 전용 trigger를 먼저 적용하므로 00004의 activity 변경은 metadata updated_at을 유지한다. 새 Unit/Block 작성, revision 변경, baseline 건수·관계 변경이 이미 있으면 00004를 중단한다.

### 적용 순서와 실패 경계

1. 별도 적용 승인을 받고 application 쓰기를 중지한다. 이전 preflight 이후 baseline이 바뀌었다면 읽기 전용 검증부터 다시 수행한다.
2. 20261005000003_add_manuscript_unit_contract.sql 전체 BEGIN~COMMIT을 한 번 실행한다.
3. schema/RPC/ACL metadata를 확인한 뒤 20261005000004_backfill_legacy_story_units.sql 전체 BEGIN~COMMIT을 한 번 실행한다.
4. supabase/preflight/20261005000004_manuscript_backfill_verification.sql을 읽기 전용으로 실행한다. 기대값은 쿼리에 표시되어 있다.
5. application 읽기/쓰기 기준을 Unit으로 전환하고 검증하기 전에는 이전 Story write 경로를 재개하지 않는다. application 전환은 이번 STEP에 포함하지 않는다.

각 migration은 별도 transaction이다. 00003 실패 시 전체 schema 변경이 rollback된다. 00004 실패 시 그 안의 복사/activity 변경은 rollback되지만 이미 성공한 00003은 남는다. 오류 이후 재실행·수정 SQL은 자동 수행하지 않고 실패 상태를 먼저 확인한다.
새 Unit 쓰기 이후 단순 코드 rollback은 최신 원고를 놓칠 수 있다. 역변환 또는 새 read path 유지 계획을 별도로 승인한다. destructive rollback SQL은 제공하지 않는다.

## 적용 전 조건과 검증

supabase/preflight/20261005000003_manuscript_unit_preflight.sql은 SELECT만 포함한다. 이번 STEP에서는 실행하지 않는다.
Remote PostgreSQL 버전, 기존 table/function/trigger/RLS/ACL, 데이터 건수·해시, 새 객체 collision을 기록한다.
특히 Project trigger가 repository baseline과 일치해야 한다. 새 컬럼/테이블/RPC가 이미 존재하면 재실행하지 않는다.
필수 runtime: owner A/B, anon, service_role, 빈 create/noop, same request retry, 병렬 create, prose/blocks save, cross-format/cross-unit rejection, stale revision, lost response, Block 교체 rollback, activity isolation, 기존 title/type concurrency.
00003은 기존 Project trigger의 함수·종류·활성 상태와 최종 effective ACL을 assertion으로 확인한다. 예상과 다르면 transaction 전체를 실패시키며 임의로 기존 권한을 변경하지 않는다. 이번 검증은 정적 검토다. 로컬 PostgreSQL compiler가 준비되어 있지 않으면 parse/실행 성공으로 보고하지 않는다.

## 다음 승인 경계

다음은 별도 Remote 적용 승인이다. 실제 ACL/default ACL의 상세 결과는 이번 요청에 첨부되지 않았으므로 역할 상속을 포함한 effective 권한은 적용 전후 metadata로 확인한다. authenticated의 신규 Project activity/structure 컬럼 UPDATE 권한은 없어야 한다. 신규 table의 service_role SELECT/INSERT/UPDATE/DELETE와 신규 RPC EXECUTE도 모두 false여야 한다.
적용 후 metadata/runtime 검증 → application 전환 순서를 지킨다. 삭제/이동 RPC, Unit title edit, Stage/Purpose, Publish, AI 및 자동 문법 변환은 선구현하지 않는다.

## E2 완료 범위와 보류 항목

현재 원고 source of truth는 manuscript_units의 server-confirmed state이다. PROSE Focus는 editable plain text와 Autosave를 제공하며 SCREENPLAY_BLOCKS는 읽기 전용이다. legacy Story는 보존하고 신규 저장·dual-write를 하지 않는다. AI와 Publish는 미구현이다.
실제 Autosave에서 Unit revision 0→1(46자), 이후 2(60자), writing pointer 및 Project metadata 보존을 확인했다. structure revision 1→2는 사용자가 Workspace에서 두 번째 Unit을 생성한 결과이다. Browser Back dirty guard는 보류이며 내부 링크와 beforeunload 보호를 전체 브라우저 이동 보호로 해석하지 않는다. 실제 IME와 로그아웃 경고 UI의 사용자 조작 확인은 최종 acceptance 항목이다.
