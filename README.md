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

## Writing Workspace

`/my` → `/projects/[id]`. 첫 저장은 사용자 session으로 manuscript RPC를 호출하고, 이후 content만 updated_at 조건으로 수정합니다.
원고는 공백-only를 허용하지 않으며 최대 100000 Unicode code points입니다. 충돌 시 입력을 유지하고 자동 덮어쓰지 않습니다.
저장은 명시적 버튼으로 수행합니다. 제목 미정 Project의 첫 저장은 제목 확정과 원고 생성을 하나의 RPC로 처리하며, 기존 제목이 있으면 기존 manuscript RPC를 사용합니다. 제목 변경은 Project만 optimistic UPDATE하고 Story 제목은 생성 당시 snapshot으로 유지합니다. 창작 형식은 Workspace에서 사용자가 직접 선택하고 확정합니다. 미결정(NULL)에서도 글을 쓸 수 있고 나중에 변경하거나 미결정으로 돌아갈 수 있습니다. 시작 문장은 원고에 자동 삽입하지 않습니다.
/my는 최근 원고 저장을 우선해 이어쓰기를 안내합니다. 제목·형식 변경 시각은 이어쓰기 순서와 원고 저장 날짜에 사용하지 않습니다. 형식은 owner session으로 creation_type만 optimistic UPDATE하며 제목과 최신 Project.updated_at을 공유합니다. 동일 값 확정은 UPDATE하지 않고, 불확실한 최초 저장 재시도 중에는 형식 변경을 막습니다.
기존 privileged Story CRUD는 제거했고 `/stories` 경로는 DB 접근 없이 404로 차단합니다.

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