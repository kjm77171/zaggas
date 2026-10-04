# ZAGGAS

Be real. Be human.
Simple outside. Deep inside.

TEXT 중심 Story IP Platform의 DAY 01 로컬 Story CRUD입니다.

## 환경 및 실행

Windows x64, Node.js 24 LTS, npm 11. 프로젝트 루트에서 실행합니다.

```powershell
npm.cmd install
npm.cmd run dev
```

http://127.0.0.1:3000/stories 에서 목록, 등록, 상세, 수정, 삭제를 확인합니다.
PowerShell 실행 정책을 변경할 필요는 없습니다.

## Supabase 설정

`.env.example`을 `.env.local`로 복사한 뒤 직접 값을 입력합니다. 실제 값은 Git이나 채팅에 공유하지 않습니다.

- `SUPABASE_URL`: 프로젝트 Connect 대화상자의 Project URL.
- `SUPABASE_SECRET_KEY`: Settings > API Keys의 Secret key (`sb_secret_` 계열).

환경변수 변경 후 개발 서버를 재시작합니다.
DB 조회가 성공한 경우에만 빈 목록을 표시하며, 설정 누락과 DB 오류는 오류 화면으로 처리합니다.
`supabase/migrations/`는 schema 정의를 보관합니다. 이미 적용한 migration은 다시 실행하지 않습니다.

## Story CRUD

`/stories` → `/stories/new` → `/stories/[id]` → `/stories/[id]/edit`.
삭제는 상세 화면에서 사용자 확인 후 실제 row를 제거합니다.
제목은 200자, 본문은 100000자까지 허용하며 공백만 입력할 수 없습니다. 서버에서 검증합니다.
본문은 HTML로 실행하지 않고 줄바꿈을 유지합니다. 시간은 UTC ISO 형식으로 표시합니다.
수정 시 DB trigger가 updated_at을 갱신하며 created_at은 유지됩니다.

## 보안 및 배포

privileged Supabase client는 서버 전용이며 development 환경에서만 DB에 접근합니다.
개발 서버는 127.0.0.1에 바인딩합니다. 외부 공개·터널 공유를 하지 않습니다.
공개 배포 전 Auth + author_id + 사용자별 RLS로 전환해야 합니다.
Production build 통과는 공개 CRUD 배포 가능을 의미하지 않습니다.
`main`은 Next.js 개발용이며 GitHub Pages는 독립 `pages` branch의 정적 WIP 페이지만 배포합니다.

## 검증

```powershell
npm.cmd run lint
npm.cmd run build
git diff --check
```

DAY 01 브라우저 CRUD, 새로고침 유지, 시간 갱신, 입력 검증, 404, 테스트 작품 삭제를 검증했습니다.
