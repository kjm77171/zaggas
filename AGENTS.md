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
- ZAGGAS는 회사 업무와 무관한 독립된 개인 Story IP Platform이다. 작은 생각이 이야기와 작품으로 자라는 경험을 제공한다: 생각 → 이야기 → 구조 → 작품 → 연결 → 가능성. 일반 편집기·SNS·AI 콘텐츠 생성기·전문 시나리오 도구를 기본 제품 모델로 삼지 않는다.
- TEXT 중심 MVP를 우선한다. CREATE → PUBLISH → DISCOVER → REACT → PROVE → EXPAND 중 초기에는 작성·공개·발견·반응에 집중한다.
- 단순한 구조와 직관적인 UI를 유지하고 미래 기능을 미리 구현하지 않는다.
- 기존 코드가 있으면 구조와 패턴을 먼저 분석하고 일관성을 유지한다.
- 작품과 이야기가 먼저 발견되도록 하며 팔로워·인기 경쟁 중심 SNS를 지향하지 않는다.
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

## 언어와 보고서
- 사용자 대상 보고서·분석 문서·계획서·작업 결과는 기본적으로 자연스러운 한국어로 작성한다.
- 불필요한 일본어, 일본식 한자, 중국어 간체·번체, 한국에서 일반적으로 쓰지 않는 한자 표현을 섞지 않는다.
- Next.js, Supabase, PostgreSQL, RLS, RPC, Workspace, Project, Story, Creation Type, Runtime E2E, Git 등 기술 용어·고유명사는 영어를 사용할 수 있다. 기술 용어를 억지로 한글화하지 않는다.
- 쉬운 한국어를 사용하고 번역투·학술 문장·한자어 남용을 피한다. 결론 → 이유 → 영향 → 다음 행동 순서로 설명한다. PASS / FAIL / STOP 표기는 유지할 수 있다.

## 제품 가치와 Continuation
- 핵심 가치: CREATE / CONNECT / MAKE IT POSSIBLE / GROW. Brand: Be real. Be human. Product philosophy: Simple outside. Deep inside.
- Creation보다 Continuation을 우선한다. 새 Project 생성을 반복 유도하기보다 이미 시작한 이야기를 다시 이어가고 싶게 만든다.
- 사람이 아니라 이야기를 기다린다. 관계의 중심은 creator follower graph가 아닌 Story / Work / IP이다.
- /my는 이야기를 다시 이어 쓰는 공간이다. 최근 원고 저장을 우선하고 이어 쓰기를 primary, 새 이야기 시작을 secondary로 유지한다. 제목·형식·이야기의 방향 변경 시각을 원고 저장 시각이나 Continuation 우선순위로 사용하지 않는다. 향후 알림·독자 관계·유지 지표에서도 이미 시작한 이야기를 이어가는 경험을 우선한다.

## UX와 디자인 참조
- UX keywords: Quiet / Warm / Spacious / Human / Minimal / Curious. 핵심 화면 원칙: One Screen, One Thought.
- 복잡한 dashboard를 기본값으로 만들지 않는다. 기능이 늘어도 첫 화면과 주요 창작 흐름은 단순하고 직관적으로 유지한다.
- Premium한 느낌은 typography·whitespace·alignment·rhythm·content width로 만든다. border·card·shadow·gradient·badge·dashboard metric·button을 과도하게 사용하지 않는다.
- Cosmos는 Visual Tone 참조이다. 여백·타이포그래피·시각적 호흡과 밀도를 참고하며 특정 화면을 복사하지 않는다.
- Reedsy Studio는 CREATE UX의 구조적 참조이다. Project 중심 navigation과 연결된 창작 도구의 성장 방향을 참고하되 모든 기능을 지금 구현하지 않는다.
- Inkitt는 DISCOVER UX의 구조적 참조이다. 공개 이야기 탐색·topic/category·reader reaction·성장 구조를 참고하되 높은 정보 밀도나 SNS 분위기를 복사하지 않는다. 시각적 톤은 Cosmos의 여백과 단순함을 유지한다.

## First Experience와 Creation Type
- First Experience는 기능 설명보다 첫 30초에 호기심과 창작 가능성을 느끼게 하는 경험이다: “어? 여기 뭐지?” → “내 생각을 여기서 한번 만들어볼 수 있겠는데?”
- profiles.interest_codes와 projects.initial_interest_codes는 raw First Experience context로 유지한다.
- filmScreenplay / novel / webNovel / essay는 작품 형식 후보이고, everydayStory는 소재·방향, empathyComfort는 의도·감정, idea는 탐색 단계, unsure는 미결정 상태이다.
- raw interest를 projects.creation_type으로 자동 변환하거나 자동 저장하지 않는다. Creation Type은 사용자가 명시적으로 확정한 작품 형식이다.
- 현재 Creation Type 후보는 SCREENPLAY / NOVEL / WEB_NOVEL / ESSAY이다. NULL은 아직 형식을 정하지 않은 정상 상태이다.
- 창작은 질문 → 생각 → 발견 → 구조로 발전시킨다. 로그라인·시놉시스·플롯·인물 변화·장면 같은 전문 지식이나 입력폼을 처음부터 요구하지 않는다. 전문 구조는 실제 도움이 될 때 도입하고, 양식과 빈칸으로 작성 압박을 만들지 않는다.

## CREATE / DISCOVER와 현재 도메인
- CREATE는 private creation workspace, DISCOVER는 public work discovery이다. 창작자의 집중 공간과 공개 작품을 발견·읽는 공간을 섞지 않는다.
- Project는 private creator work unit, 현재 Story는 private manuscript이다.
- Project.title은 현재 작품 제목의 source of truth이다. NULL은 제목 미정이고, 기존 “첫 이야기” 문자열은 실제 제목으로 취급한다.
- Story는 이야기 개요·방향·premise·향후 public work와 구분한다.
- Story.title은 최초 생성 당시 제목 snapshot이다. Project rename 시 Story.title을 변경하지 않는다.
- 향후 Work / Publication은 private Project / Story와 분리한다. private manuscript를 public reader에게 직접 노출하지 않는다.
- Reader View와 Reader Signals는 public publication 위에 구축한다.

## AI Partner와 향후 Workspace
- 이야기의 주인은 항상 사용자이다. AI는 창작자를 대체하지 않으며 Partner / Editor / Assistant / Guide로 질문·생각 정리·창작 방법 설명·막혔을 때 방향 제안을 돕는다. 작품 전체 자동 생성을 기본 경험으로 만들지 않는다.
- AI Partner는 Creation Workspace 안에서 필요한 순간에 나타난다. 별도 중심 화면, 항상 화면의 30~40%를 차지하는 chat panel, ChatGPT clone을 기본값으로 만들지 않는다.
- 향후 질문 → 사용자 답변 → AI 구조화 → 창작 요소 반영 흐름을 지향한다.
- Creation Type별 Workspace 방향은 다음과 같다. 이는 현재 구현 목록이 아니라 architecture direction이다.
  - SCREENPLAY: Story / Characters / Timeline / Scenes / Script.
  - NOVEL: Story / Characters / World / Outline / Chapters / Manuscript.
  - WEB_NOVEL: Story / Characters / World / Episodes / Manuscript.
  - ESSAY: Thought / Structure / Manuscript.
- Creation Definition → Workspace Skeleton → 필요한 기능의 점진적 구현 순서로 확장한다.
- 현재 기능에 필요한 최소 모델만 추가한다. characters·scenes·timeline·world·chapters·episodes 등 미래 table을 미리 만들지 않는다. 실제 기능이 필요할 때 DB schema를 확장한다.

## 향후 Reader / Connect
- READ는 시스템이 meaningful reading을 감지하는 신호이며 사용자 버튼으로 만들지 않는다. 정확한 threshold는 Public 단계에서 결정한다. 현재 READ DB를 만들지 않는다.
- EMPATHY는 사용자가 명시적으로 표현하는 신호이다.
- WAITING은 creator follow가 아닌 특정 이야기의 다음 이야기를 기다리는 관계이다. 장기적으로 Retention과 IP Potential의 신호가 될 수 있다.
- 이 방향은 현재 Public / Reader / Connect 기능 구현 승인을 의미하지 않는다.

## 현재 CREATE 경험과 출발점
- 창작의 발전 방향은 First Experience → Project 생성 → 이야기의 출발점 → 원고 → 작품 형식 → 이야기의 방향 → 향후 창작 구조이다. 필수 wizard나 순서 제약이 아니며, 형식·방향·기획 도구 사용 전에도 원고를 쓸 수 있다.
- projects.seed_sentence는 처음 이야기를 시작한 생각인 ‘이야기의 출발점’이다. 원고·방향·시놉시스·공개 소개와 구분하고 자동 복사하거나 원고에 삽입하지 않는다.
- 출발점은 원고가 없으면 최초 펼침, 기존 원고가 있으면 최초 접힘이다. 의미 있는 seed가 없으면 생략하며 사용자가 자유롭게 펼치고 접는다. 같은 집필 세션의 첫 저장 후 자동으로 접지 않는다.
- Workspace는 Project Context → Story Origin → Manuscript 위계를 유지한다. 제목은 작품의 정체성, 형식은 가벼운 보조 맥락이며 원고가 주요 Canvas이다. raw 관심사는 현재 Workspace UI에 노출하지 않는다.
- Creation Type은 현재 맥락만 변경하며 편집기·원고·저장 내용을 변환하지 않는다. 시나리오·소설·웹소설·에세이와 NULL 모두 같은 원고 편집기를 사용한다.
- 실제 두 번째 창작 도구가 생길 때만 최소 탐색을 추가한다. STEP 6 방향은 ‘원고 / 이야기의 방향’이며 인물·장면·세계·구성·장·회차·AI의 빈 메뉴나 Coming Soon UI를 만들지 않는다.

## 이야기의 방향 — 승인된 제품 원칙
- ‘이야기의 방향’은 지금 이 글에서 더 들여다볼 것과 발견하는 방향을 남기는 private·optional·editable 창작 맥락이다. 출발점을 반복하는 필드, 집필 선행 조건, 전문 기획 양식, 완료 체크리스트, 생성 시놉시스 또는 공개 metadata가 아니다.
- 공통 질문은 모든 Creation Type과 NULL·ESSAY에 적용하며 사용자 테스트로 개선할 수 있다. 현재 질문 기준은 다음과 같다.
  1. 이 글에서 지금 가장 마음이 가는 것은 무엇인가요? 안내: 사람, 순간, 생각, 감정 중 무엇이든 괜찮아요.
  2. 그것에 대해 아직 잘 모르겠거나, 더 궁금한 것은 무엇인가요? 안내: 정답을 찾지 않아도 괜찮아요. 지금 떠오르는 질문만 남겨보세요.
  3. 왜 이것이 마음에 남았을까요? 안내: 이유를 정확히 설명하지 못해도 괜찮아요.
  4. 이 글을 읽고 어떤 느낌이나 생각이 남았으면 하나요?
- 한 화면에서 한 질문과 생각에 집중한다. 질문 → 사용자 답변 → 저장하고 다음 흐름을 기본으로 검토하며 건너뛰기·부분 응답·나중에 이어가기를 허용한다. 완료율·필수 표시·달성 배지·설정 완료 압박을 만들지 않는다.
- 초기 결과는 사용자 원문을 ‘지금 마음이 가는 것 / 아직 궁금한 것 / 마음에 남는 이유 / 남기고 싶은 느낌’으로 정돈해 표시한다. 답한 항목만 보여도 유용하며 개별 수정이 가능해야 한다. 실제 AI 기능 없이 해석이나 요약을 생성하지 않는다.
- 방향은 Project·Story timestamp와 분리된 private 저장 도메인을 지향한다. Project 0..1 방향은 현재 후보이며 상세 schema·DB/RLS·저장·동시성 계약은 아직 승인되지 않았다. STEP 6-A 검토 전 특정 테이블·migration·RPC를 확정하거나 생성하지 않는다.
- 방향 답변으로 Creation Type을 자동 결정하거나 인물·장면·구성·세계·공개 metadata를 자동 생성하지 않는다. 향후 구조화는 명시적 사용자 행동을 거친다.
- 향후 AI는 사용자 답변을 듣고 후속 질문·정리·명료화·연결 발견을 돕는다. 사용자 원문과 AI 제안은 구분하며 사용자 의도·답변을 조용히 교체하거나 정답 구조를 선언하지 않는다.
- 출발점·방향·향후 기획 메모는 공개하지 않는다. Publish에서 사용자가 공개할 내용을 명시적으로 선택한다.

## 주요 STEP 전 제품 맥락 동기화
- 주요 STEP 전에 최신 승인된 기획·사업계획·UX·제품 결정을 AGENTS.md와 비교한다. 철학·흐름·화면·사용성·차별성·향후 구조에 영향을 주는 지속 원칙이 누락되거나 오래됐으면 승인된 문서 수정 범위에서 먼저 갱신한다. 문서 수정 승인이 없다면 차이를 보고하고 승인받는다.
- 사업계획의 차별성은 실제 제품 행동으로 증명한다. 아직 사용자 가치가 없는 사업 개념을 UI에 강제로 넣거나 기능 목록을 부풀리지 않는다.
- 주요 기능은 핵심 경험을 선명하게 하는지, Continuation을 돕는지, 사용자의 이야기 발견·발전을 돕는지, 조기 복잡성을 만드는지, CREATE/DISCOVER 경계를 지키는지, AI·인물·장면·Publish·Discover·Connect·IP 확장을 막지 않는지 점검한다. 좋은 아이디어라도 이르면 보류한다.
- architecture 결정·DB 변경·application 구현·Git 마무리는 서로 다른 승인 경계를 유지한다. 문서 동기화는 기능 구현이나 migration 적용 승인을 뜻하지 않는다.

## 개발 절차와 큰 STEP 사전 점검
- 기존 분석 → 승인 → 구현 → 검증 규칙에 더해, 전체 흐름은 Codex analysis → 사용자/검토자 review → explicit approval → implementation → static validation → runtime E2E → final review → commit/push이다. commit/push는 별도 승인 범위에서만 수행한다.
- 구현 승인 전 DB migration을 적용하지 않는다. migration 실제 적용은 별도 승인 대상이다.
- 미래에 필요할 것 같다는 이유로 요청 범위를 확대하지 않는다. AI APIs/UI, Publication, Discover, Connect, Reader signals, Admin CMS, advanced structured editor, future workspace tables는 별도 승인 없이 추가하지 않는다.
- 큰 STEP에서 코딩 전에 아래를 점검하고 충돌 가능성이 있으면 구현 전에 보고한다.
  1. 현재 Product 원칙과 충돌하는가?
  2. CREATE / DISCOVER 중 어느 영역인가?
  3. Continuation을 약화시키는가?
  4. raw interest와 Creation Type을 혼동하는가?
  5. AI가 사용자를 대체하는 구조인가?
  6. 미래 architecture를 너무 일찍 구현하는가?
  7. Cosmos / Reedsy / Inkitt 참조 역할을 혼동하는가?
  8. 기존 완료된 창작 루프를 깨는가?

## 완료된 제품 상태와 다음 승인 경계
- 완료된 기능: Public Home, First Experience, Kakao Auth/onboarding, My ZAGGAS, Project 생성, private 원고 Workspace, 제목·Continuation 흐름, 명시적 Creation Type 선택, 정돈된 CREATE Workspace Skeleton. 이미 완료된 기능을 미래 작업으로 취급하지 않는다.
- 회귀 보호 대상: First Experience → Project → Workspace → manuscript → title decision → atomic first save → My ZAGGAS → continue writing. 제목·형식·원고 저장, 충돌·재시도·미저장 입력 보호도 유지한다.
- 기술 기반: Next.js / TypeScript / React / Supabase / App Router.
- DAY04 STEP 5 기준점은 ca6df28e116e58bccf7e5405fd2dc200564f17d8이다. 완료 이력이며 이후 작업의 고정 HEAD 요구값이 아니다. 매번 실제 Git 상태와 해당 요청의 expected HEAD를 확인한다.
- 다음 기능은 STEP 6 Story Direction이다. 먼저 STEP 6-A DB / Security / Save Contract를 별도로 설계·검토·승인받는다. 그 전 migration이나 application 기능을 구현하지 않는다.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
