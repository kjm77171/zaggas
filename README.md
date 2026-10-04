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

http://localhost:3000/stories 에서 목록, 등록, 상세, 수정, 삭제를 확인합니다.
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
개발 서버는 localhost에 바인딩합니다. 외부 공개·터널 공유를 하지 않습니다.
공개 배포 전 기존 Story CRUD를 사용자 session과 owner_id 기반 RLS 접근으로 전환해야 합니다.
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
실제 AI는 아직 연결하지 않습니다. Kakao Auth 설정 후 첫 문장을 Project로 저장할 수 있습니다. 기존 개발용 Story CRUD는 `/stories`에서 그대로 사용합니다.

## DAY 02 Kakao Auth

Auth에는 @supabase/ssr의 쿠키 기반 PKCE session client를 사용합니다.
.env.local에 NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY를 직접 입력합니다.
Secret key를 public 변수에 넣지 않습니다. 기존 Story Secret client는 변경하지 않습니다.

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
이 단계는 기존 /stories privileged 개발 CRUD를 공개 서비스용으로 전환하지 않습니다.