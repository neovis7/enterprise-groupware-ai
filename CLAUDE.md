# AI 기능 중심의 대기업 그룹웨어

엔터프라이즈 그룹웨어 프로젝트입니다. 결재, 조직, 메시지, 일정, AI 어시스턴트 기능을 포함합니다.

## 핵심 참조 파일

- `src/types/api-contracts.ts` — 모든 API Zod 스키마 (단일 진실 소스)
- `src/types/api-fixtures.ts` — API 응답 예시 (프론트엔드 구현 참조)
- `docs/user-flows.md` — 5대 핵심 사용자 플로우
- `docs/crud-matrix.md` — 엔티티별 CRUD 완성도 매트릭스

---

## Harness-Generated Team

> 이 섹션은 `/ax`에 의해 자동 생성되었습니다.
> 생성일: 2026-04-16
> 도메인: AI 기능 중심의 대기업 그룹웨어 구축
> 패턴: 계층적 위임 + 생성-검증

### 에이전트 카탈로그

| 에이전트 | 역할 | 모델 | 트리거 |
|---------|------|------|--------|
| system-architect | architect | claude-opus-4-6 | 아키텍처, 시스템 설계, 기술 스택, DDD, 도메인 모델, 마이크로서비스, AI 통합 전략 |
| backend-developer | executor | claude-sonnet-4-6 | API 구현, 백엔드, 결재 API, 조직 API, 일정 API, DB 스키마, Prisma, 서버 구현, 알림 시스템 |
| ai-integration-engineer | executor | claude-sonnet-4-6 | AI 기능, LLM, RAG, 벡터 검색, AI 어시스턴트, 문서 검색, 프롬프트, pgvector, SSE 스트리밍 |
| frontend-developer | executor | claude-sonnet-4-6 | 프론트엔드, UI, 컴포넌트, 결재 UI, 대시보드, 메시지 UI, 일정 UI, AI 어시스턴트 패널, shadcn |
| code-reviewer | reviewer | claude-sonnet-4-6 | 코드 리뷰, 검수, 보안 검사, OWASP, SOLID 검증, CRUD 완성도, PR 검토 |
| visual-architect | architect | claude-opus-4-6 | 디자인 시스템, 디자인 토큰, 컬러 팔레트, glassmorphism, 테마, 시각화 설계 |
| visual-builder | executor | claude-sonnet-4-6 | 시각 컴포넌트, 결재 시각화, 조직도, 애니메이션, 인포그래픽, 차트, 타이핑 애니메이션 |
| visual-qa | reviewer | claude-sonnet-4-6 | UI 검수, 시각 품질, 접근성, WCAG, 반응형, 다크모드, AI 슬롭, 디자인 토큰 검증 |

### 위임 규칙

- **아키텍처/설계 요청** → `system-architect` (DDD 도메인 모델, 기술 스택, AI 통합 전략)
- **백엔드 API 구현** → `backend-developer` (결재/조직/일정/공지/알림 REST API, Prisma, 인증)
- **AI 기능 구현** → `ai-integration-engineer` (LLM 연동, RAG 파이프라인, SSE 스트리밍, 결재 초안)
- **프론트엔드 UI 구현** → `frontend-developer` (Next.js 페이지, shadcn 컴포넌트, 사용자 플로우)
- **코드 검수/보안** → `code-reviewer` (SOLID, OWASP Top 10, CRUD 완성도, 테스트 커버리지)
- **디자인 시스템 설계** → `visual-architect` (디자인 토큰, glassmorphism, 컴포넌트 패턴)
- **시각 컴포넌트 구현** → `visual-builder` (결재 타임라인, 조직도 트리, AI 타이핑 애니메이션)
- **UI 품질 검수** → `visual-qa` (WCAG 2.1 AA, AI 슬롭 탐지, 다크/라이트 일관성)

### API 계약 (backend+frontend 병렬 실행 시)

> 병렬 에이전트 간 API 응답 구조 불일치를 방지하기 위한 규칙

- **계약 파일**: `src/types/api-contracts.ts` — 모든 API 엔드포인트의 요청/응답 Zod 스키마
- **행동 의도**: 각 엔드포인트의 `@intent` JSDoc을 반드시 읽고, 스키마 형태뿐 아니라 행동 목적에 맞게 구현
- **상태별 응답**: `z.discriminatedUnion`으로 정의된 상태별 응답 변형을 모두 처리
- **backend-developer**: API 응답은 반드시 계약 스키마와 `@intent`에 맞춰 구현. 스키마 형태만 맞추고 의도가 다르면 계약 위반.
- **frontend-developer**: API 호출 결과는 반드시 계약 스키마로 파싱. `@intent`를 읽고 상태별 UI 분기를 구현.
- **컬럼명 규칙**: DB 컬럼명(snake_case) → API 필드명(camelCase) 변환만 허용. 의미가 다른 이름 사용 금지.
- **생성 시점**: Phase 1(아키텍처) 완료 후, Phase 2(병렬 구현) 시작 전에 반드시 생성
- **변경 절차**: API 계약 변경 시 backend + frontend 양쪽에 영향 분석 필수

### 사용자 플로우 (backend+frontend 병렬 실행 시)

> 스키마(데이터 구조)와 별도로, 사용자가 시스템을 사용하는 행동 시나리오를 정의합니다.

- **플로우 파일**: `docs/user-flows.md` — 핵심 사용자 행동의 단계별 API 호출 시퀀스
- **backend-developer**: 각 API가 사용자 플로우의 어느 단계에서 호출되는지 확인하고, 해당 단계에서 필요한 데이터를 반드시 반환
- **frontend-developer**: 사용자 플로우의 단계별 시퀀스를 따라 UI를 구현. 이전 단계의 응답 데이터를 다음 단계에 전달하는 방식을 플로우 문서에서 확인
- **인증 플로우 필수**: 로그인 → 페이지 새로고침 → 세션 유지 확인이 반드시 포함되어야 함
- **통합 검증 의무**: 병렬 구현 완료 후, 모든 핵심 플로우가 실제로 작동하는지 E2E 스모크 테스트 필수

### 실행 프로토콜

- **패턴**: system-architect가 상위 위임자로 backend/AI/frontend 팀에 독립 작업을 위임. 각 레이어는 executor→reviewer 생성-검증 사이클을 적용하여 품질을 보장.
- **병렬**: 독립 작업은 팬아웃으로 병렬 실행
- **검증**: 모든 생성물은 reviewer 에이전트 통과 필수
- **통합 검증**: 병렬 에이전트 완료 후 핵심 사용자 플로우 E2E 스모크 테스트 통과 필수
- **에스컬레이션**: 3회 실패 시 사용자에게 알림

### CRUD 완성도 규칙 (fullstack/api 프로젝트)

> `docs/crud-matrix.md`에 정의된 모든 엔티티의 CRUD 작업이 백엔드 + 프론트엔드 + 메뉴에서 완전히 구현되어야 합니다.

- **매트릭스 파일**: `docs/crud-matrix.md` — 엔티티별 CRUD 작업, 역할, 필수 여부
- **backend-developer**: 매트릭스의 '필수=O' 행에 대해 모든 API 엔드포인트를 구현. 매트릭스에 없는 API는 구현 금지.
- **frontend-developer**: 매트릭스의 '필수=O' 행에 대해 모든 페이지/컴포넌트를 구현. **hooks를 정의만 하고 사용하지 않는 것은 미구현으로 간주.**
- **네비게이션 필수**: 매트릭스의 모든 메뉴 항목이 TopNav/라우터에 등록되어야 함. 메뉴 없이 URL로만 접근 가능한 기능은 미구현으로 간주.
- **API 경로 일치**: 프론트 hook의 API 경로(메서드 + path)와 백엔드 라우트가 정확히 일치해야 함.

### 컨텍스트 관리 (메모리 소진 방지)

대규모 작업 시 컨텍스트가 가득 차는 것을 방지하기 위한 규칙:

- **서브에이전트 분리 필수**: 각 기능/모듈 구현은 별도 `Agent()` 호출로 실행. 서브에이전트는 독립 컨텍스트를 가지므로 부모의 컨텍스트를 소비하지 않음.
- **파일 기반 통신**: 서브에이전트에 필요한 정보는 파일 경로를 전달 (Read하도록 지시). 결과도 파일로 저장하고, 부모는 경로만 기록.
- **대량 작업 분할**: 파일 10개 이상 생성 → 5개씩 배치 분할. 코드 → backend/frontend 분할.
- **부모 역할 제한**: 부모(오케스트레이터)는 디스패치 + 결과 확인만 수행.
- **CLAUDE.md 전달**: 서브에이전트에 항상 "CLAUDE.md를 먼저 Read하라"고 지시.

### 진행률 표시

에이전트 실행 시 사용자에게 진행 상태를 시각적으로 표시합니다:
- 디스패치 시: `[순번/총수] 에이전트명 — 작업 설명... (N개 파일)`
- 완료 시: progress.json 기반 % 갱신 (`✓` 완료, `▶` 진행 중, `·` 대기, `✗` 에러)
- 병렬 실행: 먼저 완료된 에이전트부터 갱신, 전체 완료 후 통합 요약

### 진행률 추적 및 압축 복구

모든 에이전트는 `.omc/ax/progress.json`에 작업 진행률을 기록합니다:

- **파일 생성 즉시 Write**: 메모리에 보관하지 않고 즉시 디스크에 저장
- **completed_files 갱신**: 파일 생성/수정할 때마다 progress.json의 completed_files에 추가
- **에러 기록**: 실패 시 errors 배열에 `{ agent, file, error, timestamp }` 추가

**컨텍스트 압축 후 복구 프로토콜:**
1. `.omc/ax/progress.json` Read → 현재 상태 파악
2. `completed_files` 목록의 파일은 건너뜀 (중복 생성 방지)
3. `pending_files`부터 재개
4. `CLAUDE.md`, `docs/user-flows.md`, `docs/crud-matrix.md` 다시 Read

### 최종 배포 게이트

다음 조건을 **모두** 충족해야 배포 승인:
1. code-reviewer PASS (SOLID + OWASP Top 10 + CRUD 완성도 100%)
2. 핵심 사용자 플로우 E2E 스모크 테스트 PASS (로그인/결재/AI 어시스턴트 플로우 포함)
3. CRUD 매트릭스 완성도 100% (필수=O 행 전수 BE+FE+메뉴 구현)
4. visual-qa 점수 45/60 이상 (WCAG 2.1 AA + AI 슬롭 0건)
5. AI 어시스턴트 SSE 스트리밍 정상 작동 + RAG sources[] 반환 확인
