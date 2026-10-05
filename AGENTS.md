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
- 모든 Codex 보고서와 프로젝트 문서의 기본 서술 언어는 자연스러운 한국어이다.
- 일반 한국어 문장에 일본어 문장·조사·활용·일본식 보고서 문체를 섞지 않는다. 자연스러운 한국어 표현이 있는 곳에 불필요한 일본어·중국어·한자 표현을 사용하지 않는다.
- Next.js, Supabase, PostgreSQL, RLS, RPC, Workspace, Project, Story, Creation Type, Runtime E2E, Git 등 기술 용어·고유명사, 코드·SQL 식별자, framework/library/product 이름과 표준 개발 약어는 영어를 사용할 수 있다. 기술 용어를 억지로 한글화하지 않는다.
- 쉬운 한국어를 사용하고 번역투·학술 문장·한자어 남용을 피한다. 결론 → 이유 → 영향 → 다음 행동 순서로 설명한다. PASS / FAIL / STOP 표기는 유지할 수 있다.
- 주요 보고서·문서를 제출하기 전에 언어를 자체 점검한다. 의도하지 않은 일본어가 섞였으면 완료로 처리하지 않고 한국어로 바로잡은 뒤 제출한다.

## 제품 가치와 Continuation
- 핵심 가치: CREATE / CONNECT / MAKE IT POSSIBLE / GROW. Brand: Be real. Be human. Product philosophy: Simple outside. Deep inside.
- 아직 자신을 창작자라고 생각하지 않는 사람도 작은 생각을 발견하고 발전시켜 작품으로 만들고 세상과 연결하도록 돕는다. MVP 기능은 누군가의 이야기를 한 걸음 앞으로 움직이는지 판단하고, 그렇지 않으면 제외하거나 보류한다.
- Creation보다 Continuation을 우선한다. 새 Project 생성을 반복 유도하기보다 이미 시작한 이야기를 다시 이어가고 싶게 만든다.
- 사람이 아니라 이야기를 기다린다. 관계의 중심은 creator follower graph가 아닌 Story / Work / IP이다.
- /my는 이야기를 다시 이어 쓰는 공간이다. 최근 원고 저장을 우선하고 이어 쓰기를 primary, 새 이야기 시작을 secondary로 유지한다. 제목·형식·이야기의 방향 변경 시각을 원고 저장 시각이나 Continuation 우선순위로 사용하지 않는다. 향후 알림·독자 관계·유지 지표에서도 이미 시작한 이야기를 이어가는 경험을 우선한다.

## UX와 디자인 참조
- UX keywords: Quiet / Warm / Spacious / Human / Minimal / Curious. UI 원칙: One Screen, One Thought / One Primary Action / Consistency First / Intuitive First / Quiet by Default / Content First / Creation First, Platform Second / Progressive Complexity / Same Mental Model / AI is a Partner, not the Creator.
- 잘 정돈된 방처럼 느껴져야 한다. 화면 구성은 달라도 Button / Link / Input / Selection / Work Area / Secondary Action의 역할은 바로 알아볼 수 있어야 한다. 제품상의 이유 없이 화면별 UI 문법을 만들지 않는다.
- 의미가 같은 UI 역할에는 공유 Design Tokens를 사용하고, 동작과 markup이 같아야 하는 부분에는 공유 Component를 사용한다. 승인된 Visual Grammar v1을 유지하며 임의의 화면별 CSS 값을 피한다. 디자인 시스템은 작게 유지하고 범용 대형 UI framework를 만들지 않는다.
- 따뜻한 흰색·off-white 배경, charcoal 본문, gray 보조 텍스트, 절제된 강조색 하나를 사용한다. 큰 여백과 typography로 위계를 만들고 border·shadow·gradient·motion을 과하게 사용하지 않는다. 상호작용은 미묘하게 표현하고 장식적 motion을 복사하지 않는다.
- 복잡한 dashboard를 기본값으로 만들지 않는다. 기능이 늘어도 첫 화면과 주요 창작 흐름은 단순하고 직관적으로 유지한다.
- Premium한 느낌은 typography·whitespace·alignment·rhythm·content width로 만든다. border·card·shadow·gradient·badge·dashboard metric·button을 과도하게 사용하지 않는다.
- Cosmos는 Visual Tone 참조이다. 여백·타이포그래피·시각적 호흡과 밀도를 참고하며 특정 화면을 복사하지 않는다.
- Reedsy Studio는 CREATE UX의 구조적 참조이다. Project 중심 navigation과 연결된 창작 도구의 성장 방향을 참고하되 모든 기능을 지금 구현하지 않는다.
- Inkitt는 DISCOVER UX의 구조적 참조이다. 공개 이야기 탐색·topic/category·reader reaction·성장 구조를 참고하되 높은 정보 밀도나 SNS 분위기를 복사하지 않는다. 시각적 톤은 Cosmos의 여백과 단순함을 유지한다.

## First Experience와 Creation Type
- First Experience는 기능 설명보다 첫 30초에 호기심과 창작 가능성을 느끼게 하는 경험이다: “어? 여기 뭐지?” → “내 생각을 여기서 한번 만들어볼 수 있겠는데?” 회원가입은 서비스 등록보다 내 이야기를 저장하고 계속 만드는 행동으로 느껴져야 한다.
- profiles.interest_codes와 projects.initial_interest_codes는 raw First Experience context로 유지한다.
- filmScreenplay / novel / webNovel / essay는 작품 형식 후보이고, everydayStory는 소재·방향, empathyComfort는 의도·감정, idea는 탐색 단계, unsure는 미결정 상태이다.
- raw interest를 projects.creation_type으로 자동 변환하거나 자동 저장하지 않는다. Creation Type은 사용자가 명시적으로 확정한 작품 형식이다.
- 현재 Creation Type 후보는 SCREENPLAY / NOVEL / WEB_NOVEL / ESSAY이다. NULL은 아직 형식을 정하지 않은 정상 상태이다.
- Creation Type은 단순 표시 category가 아니라 향후 Writing Template → Workspace Structure → Writing Guide → AI Partner Rules → Publish Structure의 기준이다. 현재 projects.creation_type 기반을 유지하고, 미확정 taxonomy table이나 형식별 전체 화면 복제는 만들지 않는다.
- 장기적으로 공통 구조 70–80%와 형식별 구조 20–30%를 지향하되 고정 구현 비율로 삼지 않는다. 모든 형식에 공통이면 공통 Domain / Component를 우선하고, 해당 형식의 본질적인 차이일 때만 전용 동작을 도입한다.
- 창작은 질문 → 생각 → 발견 → 구조로 발전시킨다. 로그라인·시놉시스·플롯·인물 변화·장면 같은 전문 지식이나 입력폼을 처음부터 요구하지 않는다. 전문 구조는 실제 도움이 될 때 도입하고, 양식과 빈칸으로 작성 압박을 만들지 않는다.

## CREATE / DISCOVER와 현재 도메인
- CREATE는 private creation workspace, DISCOVER는 public work discovery이다. 창작자의 집중 공간과 공개 작품을 발견·읽는 공간을 섞지 않는다. 두 영역은 같은 ZAGGAS 디자인 언어를 공유한다. CREATE에서는 주변이 조용해지고 자신의 작업 공간에 들어가는 느낌을 지키며 순위·인기·알림·공개 경쟁을 계속 노출하지 않는다.
- Project는 private creator work unit, 현재 Story는 private manuscript이다.
- Project.title은 현재 작품 제목의 source of truth이다. NULL은 제목 미정이고, 기존 “첫 이야기” 문자열은 실제 제목으로 취급한다.
- Story는 이야기 개요·방향·premise·향후 public work와 구분한다.
- Story.title은 최초 생성 당시 제목 snapshot이다. Project rename 시 Story.title을 변경하지 않는다.
- 향후 Work / Publication은 private Project / Story와 분리한다. private manuscript를 public reader에게 직접 노출하지 않는다.
- Reader View와 Reader Signals는 public publication 위에 구축한다.

## AI Partner와 향후 Workspace
- 이야기의 주인은 항상 사용자이다. AI는 창작자를 대체하지 않으며 Partner / Editor / Assistant / Guide로 질문·생각 정리·창작 방법 설명·막혔을 때 방향 제안을 돕는다. 작품 전체 자동 생성을 기본 경험으로 만들지 않는다.
- AI Partner는 Creation Workspace 안에서 필요한 순간에 나타난다. 별도 중심 화면, 항상 화면의 30~40%를 차지하는 chat panel, ChatGPT clone을 기본값으로 만들지 않는다.
- 향후 대화 → 생각 → 구조화 제안 → 사용자 검토 → 적용 → Domain Data 변경 흐름을 지향한다. 최종 결정권은 사용자에게 있으며 AI가 창작 데이터를 조용히 변경하지 않는다.
- AI Partner는 일관된 이름·아이콘·호출 방식·상호작용 모델을 유지한다. 막혔을 때 필요한 순간에 호출하는 경험을 지향한다.
- AI context는 Project / Creation Type / Story / Character / Chapter·Scene / 현재 작업 등 명시적인 domain data로 구성하고 렌더링된 UI 문구를 수집해 만들지 않는다. 향후 ZAGGAS Domain → AI Partner Service → AI Provider Adapter → External AI API 경계를 유지해 Application Core가 특정 provider에 직접 종속되지 않도록 한다. provider 계층은 필요해질 때 구현한다.
- 장기 CREATE 모델은 Global Header → Project Header → Project Navigation + Main Creation Area → 필요할 때 AI Partner이다. 왼쪽 작업 구조·가운데 현재 창작이라는 방향만으로 상시 sidebar를 구현하지 않는다. 현재 원고 / 이야기의 방향이 최소 실제 Project Navigation이며 실제 기능이 있을 때만 탐색 도구를 추가한다.
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
- Discover를 중독성 feed로 만들지 않으며 순위·조회수·팔로워·인기 경쟁과 banner·category 과밀을 중심에 두지 않는다. 공감했어요 / 계속 보고 싶어요 / 영감을 받았어요 / 함께 만들고 싶어요는 제품 후보이며 확정된 구현 요구사항이 아니다.
- 이 방향은 현재 Public / Reader / Connect 기능 구현 승인을 의미하지 않는다.

## 현재 CREATE 경험과 출발점
- 창작의 발전 방향은 First Experience → Project 생성 → 이야기의 출발점 → 원고 → 작품 형식 → 이야기의 방향 → 향후 창작 구조이다. 필수 wizard나 순서 제약이 아니며, 형식·방향·기획 도구 사용 전에도 원고를 쓸 수 있다.
- projects.seed_sentence는 처음 이야기를 시작한 생각인 ‘이야기의 출발점’이다. 원고·방향·시놉시스·공개 소개와 구분하고 자동 복사하거나 원고에 삽입하지 않는다.
- 출발점은 원고가 없으면 최초 펼침, 기존 원고가 있으면 최초 접힘이다. 의미 있는 seed가 없으면 생략하며 사용자가 자유롭게 펼치고 접는다. 같은 집필 세션의 첫 저장 후 자동으로 접지 않는다.
- Workspace는 Project Context → Story Origin → Manuscript 위계를 유지한다. 제목은 작품의 정체성, 형식은 가벼운 보조 맥락이며 원고가 주요 Canvas이다. raw 관심사는 현재 Workspace UI에 노출하지 않는다.
- Creation Type은 현재 맥락만 변경하며 편집기·원고·저장 내용을 변환하지 않는다. Focus는 Unit.content_format 기준이며 PROSE는 E2 편집·Autosave, SCREENPLAY_BLOCKS는 읽기 전용이다. Project 형식과 NULL은 기존 Unit 저장 문법을 바꾸지 않는다.
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
- Project에는 하나의 논리적인 ‘이야기의 방향’ 맥락이 있다. 승인된 물리 저장 모델은 project_story_direction_answers의 Project × question_key별 답변 행이며 기본 식별자는 (project_id, question_key)이다. 네 답변 컬럼을 가진 단일 행이나 별도 부모 행을 만들지 않는다.
- 안정적인 내부 질문 key는 focus / exploration / meaning / after_feeling이다. 한국어 표시 문구는 별도로 개선할 수 있으며 DB/API 식별자로 사용하지 않는다. 각 답변의 question_set_version은 질문의 의미를 나타낸다. 표현·안내만 바뀌면 유지할 수 있고 의미가 바뀌면 버전을 검토한다. 범용 설문 엔진을 만들지 않는다.
- 한 저장 요청은 정확히 한 답변만 변경한다. 한 답변 수정 때문에 전체 답변을 전송하거나 갱신하지 않는다. 각 답변 행의 integer revision으로 동시성을 관리한다. 서로 다른 질문은 독립적으로 저장할 수 있고 같은 질문의 오래된 수정은 충돌로 처리한다. projects.updated_at이나 stories.updated_at을 방향의 동시성 기준으로 사용하지 않는다.
- 실제 저장 요청은 안정적인 request ID를 사용하고 last_request_id를 보존한다. 응답을 받지 못한 재시도는 원래 Project·질문 key·답변·질문 버전·expected revision·request ID를 그대로 사용한다. 재시도가 두 번째 변경을 만들거나 최신 답변을 덮어쓰면 안 된다. 전체 요청 이력 원장은 현재 만들지 않는다.
- 현재 revision에서 저장된 값과 같은 값을 저장하면 no-op으로 처리하며 revision·updated_at·창작 활동을 변경하지 않는다. 기존 답변 비우기는 answer = NULL로 저장하고 행을 삭제하지 않아 revision 상태를 유지한다. 한 번도 저장하지 않은 미응답 질문은 행이 없어도 된다.
- 답변 저장 한도는 2,000 Unicode code points이다. 이는 저장 용량이며 UI는 짧은 생각 쓰기를 돕는다. 줄바꿈·emoji·일반 Unicode를 허용하고 공백만 있는 입력은 NULL로 처리한다. 불필요한 정규화 없이 사용자 원문을 보존하며 DB/RPC 경계에서 최종 검증한다.
- 조회는 Project 소유자 RLS 아래 직접 SELECT, 변경은 전용 저장 RPC를 사용한다. RPC 후보는 zaggas_save_story_direction_answer이며 authenticated의 직접 INSERT/UPDATE/DELETE를 일반 저장 경로로 허용하지 않는다. RPC는 auth.uid()로 사용자를 식별하고 Project 소유권·질문 key 허용 목록·revision을 검증하며 최초 저장 경쟁·응답 유실 재시도·최신 데이터 보호를 처리한다.
- 방향은 authenticated 소유자만 사용하는 private 맥락이다. anon의 읽기·쓰기를 허용하지 않으며 사용자 입력 owner ID를 신뢰하지 않는다. SECURITY DEFINER는 기존 보안 규칙, 명시적으로 안전한 search_path와 최소 권한을 따른다. service_role의 구체적인 GRANT/REVOKE는 여기서 고정하지 않고 STEP 6-B에서 기존 ZAGGAS/Supabase 권한 관례와 비교하여 결정한다.
- 방향 저장은 projects.updated_at과 stories.updated_at을 변경하지 않는다. /my Hero·Continuation·이어 쓰기 우선순위에 영향을 주거나 이를 위해 Project/Story 시각을 갱신하는 trigger를 추가하지 않는다.
- 방향 답변으로 Creation Type을 자동 결정하거나 인물·장면·구성·세계·공개 metadata를 자동 생성하지 않는다. 향후 구조화는 명시적 사용자 행동을 거친다.
- 향후 AI는 사용자 답변을 듣고 후속 질문·정리·명료화·연결 발견을 돕는다. 사용자 원문과 AI 제안은 구분하며 사용자 의도·답변을 조용히 교체하거나 정답 구조를 선언하지 않는다.
- 방향 답변은 사용자가 작성한 private 창작 맥락이다. AI 입력·출력, 공개 metadata·작품 소개, Character·Scene·Outline으로 자동 전환하지 않는다. 향후 활용은 별도 제품 설계와 명시적 사용자 행동을 거친다. 출발점·방향·향후 기획 메모는 공개하지 않으며 Publish에서 사용자가 공개할 내용을 명시적으로 선택한다.

## 주요 STEP 전 제품 맥락 동기화
- 제품 결정의 source of truth는 ZAGGAS Product Spec이다. 개발 중 미해결 제품 결정을 임의로 확정하지 않으며 중요한 새 결정이 필요하면 구현을 멈추고 Product Design 검토로 돌린다.
- 주요 STEP 전에 최신 승인된 기획·사업계획·UX·제품 결정을 AGENTS.md와 비교한다. 철학·흐름·화면·사용성·차별성·향후 구조에 영향을 주는 지속 원칙이 누락되거나 오래됐으면 승인된 문서 수정 범위에서 먼저 갱신한다. 문서 수정 승인이 없다면 차이를 보고하고 승인받는다.
- 사업계획의 차별성은 실제 제품 행동으로 증명한다. 아직 사용자 가치가 없는 사업 개념을 UI에 강제로 넣거나 기능 목록을 부풀리지 않는다.
- 주요 기능은 핵심 경험을 선명하게 하는지, Continuation을 돕는지, 사용자의 이야기 발견·발전을 돕는지, 조기 복잡성을 만드는지, CREATE/DISCOVER 경계를 지키는지, AI·인물·장면·Publish·Discover·Connect·IP 확장을 막지 않는지 점검한다. 좋은 아이디어라도 이르면 보류한다.
- architecture 결정·DB 변경·application 구현·Git 마무리는 서로 다른 승인 경계를 유지한다. 문서 동기화는 기능 구현이나 migration 적용 승인을 뜻하지 않는다.

## 개발 절차와 큰 STEP 사전 점검
- 전체 흐름은 기존 코드 분석 → 현재 구현 이해 → Product Spec 비교 → 영향 분석 → 변경 계획·대상 파일 → 사용자/검토자 review → explicit approval → implementation → build/test → browser verification → final review → commit/push이다. commit/push는 별도 승인 범위에서만 수행한다.
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
- DAY04 회귀 보호 대상: First Experience → Project → Workspace → manuscript → title decision → atomic first save → My ZAGGAS → continue writing. 기존 데이터와 충돌·재시도·미저장 입력 보호를 유지한다. DAY05 Unit 전환에서는 제목 결정을 저장의 선행 조건으로 삼지 않으며 기존 Story 계약과 신규 Unit 계약을 구분한다.
- 기술 기반: Next.js / TypeScript / React / Supabase / App Router.
- DAY04 STEP 5 기준점은 ca6df28e116e58bccf7e5405fd2dc200564f17d8이다. 완료 이력이며 이후 작업의 고정 HEAD 요구값이 아니다. 매번 실제 Git 상태와 해당 요청의 expected HEAD를 확인한다.
- DAY04는 완료되었다. Story Direction MVP와 Visual Grammar v1은 최종 runtime 검증 및 commit/push를 마쳤다. DAY05 00003 schema와 00004 legacy backfill은 사용자가 Remote 적용·검증을 완료했다. E1 application은 manuscript_units 조회, writing activity 기반 Continuation, Unit 생성 RPC와 Workspace/읽기 전용 Focus route로 전환했다. E1 실제 첫 Unit 생성·NULL 제목 runtime 검증은 완료했으며 E1 COMPLETE이다. E2 PROSE 편집·Autosave와 IndexedDB 임시 백업/복원은 구현·계약 테스트·실제 Autosave 검증 COMPLETE이다. 최종 사용자 화면 확인과 Git 마무리는 별도 단계이며 실제 IME·로그아웃 경고 UI의 사용자 조작 확인을 자동 테스트로 대체하지 않는다. SCREENPLAY_BLOCKS 편집과 AI는 미구현이다. migration 적용·데이터 전환·application 구현·Git 마무리는 각각 별도 승인 범위이다.

## DAY05 CREATE / Focus Editor 저장 원칙
- My ZAGGAS는 이야기를 다시 만나는 공간, Workspace는 작품 전체를 바라보는 공간, Focus Editor는 실제 원고를 쓰는 공간이다. 작품 선택은 Workspace, 이어 쓰기는 마지막으로 작성한 활성 Unit의 Focus Editor로 이동한다. 활성 Unit이 없으면 Workspace로 이동한다.
- 제목·형식·metadata는 글쓰기를 막지 않는다. 신규 Unit은 제목 없이 비어 있어도 생성·저장할 수 있다. Focus Editor에서는 필요한 기능만 노출하며 플랫폼 navigation을 상시 표시하지 않는다.
- projects.creation_type은 현재 작품 형식이고 manuscript_units.content_format은 실제 저장 문법이다. 신규 Unit의 기본값은 SCREENPLAY일 때 SCREENPLAY_BLOCKS, 그 외와 NULL은 PROSE이다. 형식 변경만으로 기존 원고를 변환하지 않는다. 문법 변환은 별도 명시적 Migration UX로 다룬다.
- Story Direction은 Explicit Save, Manuscript는 Autosave이다. 본문은 Unit별 integer revision, 구조는 Project별 manuscript_structure_revision으로 관리하며 서로의 revision을 변경하지 않는다. Screenplay는 Unit revision 하나 아래 전체 Block snapshot을 원자적으로 저장한다.
- Unit당 저장 요청은 직렬화하되 저장 중에도 입력할 수 있다. debounce 초기값은 약 800ms로 한곳에서 관리하며 한국어 IME 조합 중에는 snapshot을 만들지 않는다. 오류·conflict·결과 불명 상태에서 local draft를 버리거나 최신 서버 원고를 조용히 덮어쓰지 않는다. 결과 불명 재시도는 동일 request ID와 동일 snapshot을 유지한다.
- 실제 원고 변경 저장만 last_writing_at과 last_written_unit_id를 갱신한다. 빈 Unit 생성, noop, Direction, 제목·형식·순서 등 metadata 변경은 writing activity가 아니다. 이어 쓰기 대상은 같은 Project의 활성 Unit인지 확인한다. metadata 충돌 기준과 writing activity를 분리한다.
- E2는 immutable snapshot과 Unit 편집 경계별 한 in-flight 요청을 유지한다. 새 입력은 기존 요청 확인 후 다음 snapshot으로 저장하며 결과 불명 재시도는 동일 payload/revision/request ID를 사용한다. 충돌 상태도 백업하고 복원 후 자동 덮어쓰기를 금지한다. 내부 이동과 beforeunload를 보호하며 Browser Back은 router-level guard가 필요하여 보류한다.
- Local Draft Backup은 영구 저장소가 아닌 임시 복구 장치이며 server-confirmed manuscript가 영구 source of truth이다. IndexedDB key는 userId / projectId / unitId / 탭별 backupId를 포함한다. backup timestamp 기준 7일 초과 항목은 복구 후보에서 제외하고 Focus 진입 등 안전한 시점에 정리하며, 매 입력마다 전체 정리하거나 브라우저 종료 시 삭제하지 않는다.
- 로그아웃 전 DIRTY / SAVING / ERROR / RESULT_UNKNOWN 및 서버와 다른 복구 가능한 백업을 확인한다. 미확인 원고가 있으면 ‘돌아가서 확인’과 ‘로그아웃하고 삭제’를 제공하며 명시적 선택 전에는 로그아웃하지 않는다. 정상 로그아웃과 명시적 삭제 로그아웃 모두 해당 userId 백업만 삭제한다. 다른 계정은 보존하고 서버와 동일한 confirmed 백업은 미확인 원고로 취급하지 않는다.
- 공용 기기 안내는 복구·저장 오류·로그아웃처럼 관련 있는 순간에만 조용하게 표시한다. 백업에는 최소 식별자와 복구 상태만 저장하며 access token / refresh token / OAuth credential / secret을 저장하지 않는다. 복원 시 서버를 자동 덮어쓰지 않는다.
- 기존 stories는 preflight → 복사 → 검증 → application 기준 전환 후에도 보존한다. dual-write, 임의 소유권 귀속, 기존 SCREENPLAY plain text 자동 Block 파싱은 금지한다. legacy 제거와 데이터 rollback은 별도 승인 대상이다.
- Autosave는 private 원고 보존이며 Publish와 분리한다. 삭제·이동 UI, AI API/UI, Stage/Purpose와 후속 기능은 이번 저장 기반 초안의 구현 범위가 아니다.

## 확장과 화면 검토 기준
- DB는 현재 화면만을 기준으로 설계하지 않는다. User / Project / Creation Type / Story / Character / Creation Unit / Publish / Reaction 확장을 열어두되 사용하지 않는 table을 만들거나 미확정 모델의 relational / JSON 저장 방식을 미리 선택하지 않는다. 공통 Domain과 형식별 Domain을 개념적으로 구분한다.
- 주요 창작 기능은 UX / UI / DATA / AI / PUBLISH를 함께 검토한다. 다섯 층을 동시에 구현하라는 뜻이 아니라 다른 층의 의미와 향후 구조를 막지 않아야 한다는 뜻이다.
- Architecture는 확장 가능하게, MVP는 작게 유지한다. Timeline / World / Advanced Boards / Analytics / Collaboration / Contest / IP Marketplace / BGM은 별도 승인 전 보류한다. BGM을 나중에 도입해도 기본은 Quiet이며 자동 재생 없이 사용자가 명시적으로 켜도록 한다.
- 모바일 우선 web으로 개발하고 desktop과 mobile은 같은 mental model과 제품 동작을 유지한다. Unicode / locale / timezone / translation / global OAuth / 원문 언어 확장을 고려하되 전체 localization을 지금 구현하지 않는다.
- Product Spec과 현재 구현의 차이는 KEEP / REFINE / RESTRUCTURE / REMOVE / LATER로 분류한다. Spec이 넓어졌다는 이유만으로 작동하는 구현을 삭제하거나 다시 만들지 않는다.
- 의미 있는 UI 구현 후 같은 ZAGGAS 제품으로 보이는지, 목적이 바로 이해되는지, Primary Action이 하나로 분명한지, 설명 없이 쓸 수 있는지, Button / Link / Input 역할이 명확한지, 간격·정렬이 공유 규칙을 따르는지, 불필요한 UI가 공간을 차지하는지, content가 UI 장식보다 먼저 보이는지, AI가 지원 역할인지, mobile이 같은 mental model을 유지하는지 확인한다. 명확한 불일치는 검토 대상으로 보고한다.
- 장기 발전 순서는 Foundation → First Experience → Project / CREATE Workspace → 형식별 경험 → AI Partner → Publish → Discover → Connect이다. 이미 완료된 기반은 실제 충돌이 발견된 경우에만 변경한다.
<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
