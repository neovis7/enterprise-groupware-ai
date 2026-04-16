# enterprise-groupware-ai — 에이전트 팀 아키텍처

> 이 문서는 `/ax`에 의해 자동 생성되었습니다.
> 생성일: 2026-04-16

## 개요

**도메인**: AI 기능 중심의 대기업 그룹웨어 구축  
**선택 패턴**: 계층적 위임 (신뢰도: high)  
**보조 패턴**: 생성-검증

## 패턴 선택 근거

대기업 그룹웨어는 백엔드/AI통합/프론트엔드 레이어가 독립적으로 개발 가능하고, 각 레이어에 생성-검증 사이클이 필요한 대규모 fullstack 프로젝트입니다. system-architect가 상위 위임자로서 백엔드·AI·프론트엔드 팀에 위임하며, code-reviewer가 각 산출물에 대해 SOLID+OWASP 기반 검증을 수행합니다.

**검토한 대안:**
- **팬아웃/팬인**: 동시 병렬 실행에는 유리하지만, 그룹웨어는 레이어 간 선후 관계(아키텍처→구현→검수)가 명확하여 기각
- **전문가 풀**: 유형별 라우팅에 유리하지만, 그룹웨어의 5개 DDD 바운디드 컨텍스트는 레이어 전체가 협력하므로 기각

**최종 결정**: 계층적 위임(레이어 분리 + 순서 보장) + 생성-검증(품질 루프) 조합 채택

## 에이전트 관계도

```
사용자 요청
      ↓
system-architect (opus) ──── 전체 아키텍처·기술 결정
      │
      ├──→ backend-developer (sonnet) ──→ code-reviewer (sonnet)
      │         REST API, Prisma,               SOLID + OWASP,
      │         결재/조직/일정/공지/알림          CRUD 완성도 검증
      │
      ├──→ ai-integration-engineer (sonnet) ──→ code-reviewer (sonnet)
      │         LLM 추상화, RAG(pgvector),        보안 검수
      │         SSE 스트리밍, 결재 초안 생성
      │
      └──→ frontend-developer (sonnet) ──→ visual-qa (sonnet)
                Next.js, shadcn/ui,              WCAG 2.1 AA,
                사용자 플로우 구현               AI 슬롭 탐지

visual-architect (opus) ── 디자인 시스템 설계
      ↓
visual-builder (sonnet) ── 시각 컴포넌트 구현
      ↓
visual-qa (sonnet) ──────── UI 품질 검수
```

## 에이전트 상세

| 에이전트 | 역할 | 모델 | 도구 | 책임 |
|---------|------|------|------|------|
| system-architect | architect | claude-opus-4-6 | Read, Grep, Glob, Bash, Write | DDD 도메인 모델, 기술 스택, AI 통합 전략, API 계약 감독 |
| backend-developer | executor | claude-sonnet-4-6 | Read, Grep, Glob, Bash, Write, Edit | REST API, Prisma DB, 결재/조직/일정/공지/알림 비즈니스 로직 |
| ai-integration-engineer | executor | claude-sonnet-4-6 | Read, Grep, Glob, Bash, Write, Edit | LLM 추상화, RAG 파이프라인(pgvector), SSE 스트리밍, 결재 초안 |
| frontend-developer | executor | claude-sonnet-4-6 | Read, Grep, Glob, Bash, Write, Edit | Next.js 페이지, shadcn/ui, AI 어시스턴트 패널, 사용자 플로우 |
| code-reviewer | reviewer | claude-sonnet-4-6 | Read, Grep, Glob, Bash | SOLID+OWASP+DDD 검증, CRUD 완성도, 보안 검수 |
| visual-architect | architect | claude-opus-4-6 | Read, Grep, Glob, Write | 디자인 토큰(--app-*), glassmorphism 테마, 다크/라이트 모드 |
| visual-builder | executor | claude-sonnet-4-6 | Read, Grep, Glob, Bash, Write, Edit | 결재 타임라인, 조직도 트리, AI 타이핑 애니메이션, 알림 뱃지 |
| visual-qa | reviewer | claude-sonnet-4-6 | Read, Grep, Glob, Bash | WCAG 2.1 AA, AI 슬롭 탐지, 디자인 토큰 준수 |

## 스킬 목록

| 스킬 | 도메인 | 출처 | 설명 |
|------|--------|------|------|
| groupware-ai-assistant | code/fullstack | ax 자동 생성 | AI 어시스턴트(SSE 스트리밍), RAG 파이프라인(pgvector), 결재 초안 자동 생성, AI 일정 추천 |

## 데이터 흐름

```
사용자 요청
  → system-architect
      출력: docs/architecture-decisions.md, docs/domain-model.md

system-architect
  → backend-developer
      입력: src/types/api-contracts.ts, docs/user-flows.md, docs/crud-matrix.md
      출력: src/routes/**, src/services/**, prisma/schema.prisma, prisma/seed.ts

system-architect
  → ai-integration-engineer
      입력: src/types/api-contracts.ts (AI 스키마), docs/user-flows.md (플로우 3)
      출력: src/services/ai/**, src/lib/llm/**, src/lib/rag/**, src/routes/ai.ts

system-architect + visual-architect
  → frontend-developer
      입력: src/types/api-fixtures.ts, docs/user-flows.md, .omc/ax/design-skill-context.md
      출력: src/app/**, src/components/**, src/hooks/**

visual-architect
  → visual-builder
      입력: docs/design-system.md, src/styles/tokens.css
      출력: src/components/visual/**, src/components/charts/**

backend-developer + ai-integration-engineer + frontend-developer
  → code-reviewer
      출력: _workspace/code-review-report.md

frontend-developer + visual-builder
  → visual-qa
      출력: _workspace/visual-qa-report.md
```

## 설계 결정사항

### 1. DDD 바운디드 컨텍스트 (5개)

| 컨텍스트 | 핵심 애그리거트 | 책임 에이전트 |
|---------|--------------|-------------|
| 결재 (Approval) | Approval, ApprovalLine | backend-developer |
| 조직 (Organization) | User, Department | backend-developer |
| 메시지 (Message) | Conversation, Message | backend-developer |
| 일정 (Schedule) | Schedule, Participant | backend-developer |
| AI (AI Assistant) | AISession, AIMessage | ai-integration-engineer |

### 2. 2티어 모델 분배 원칙

- **Opus (claude-opus-4-6)**: 설계·분석·복잡 판단 에이전트 (system-architect, visual-architect)
- **Sonnet (claude-sonnet-4-6)**: 구현·검수·집계·포맷 에이전트 (나머지 6개)
- **근거**: 설계 품질은 Opus로 확보하고, 구현 속도는 Sonnet으로 최적화

### 3. API 계약 단일 진실 소스

- `src/types/api-contracts.ts` — 모든 Zod 스키마의 유일한 정의처
- `src/types/api-fixtures.ts` — 프론트엔드가 참조하는 응답 예시
- backend/frontend 병렬 구현 시 이 두 파일이 계약 기준점

### 4. 보안 아키텍처

- **인증**: httpOnly 쿠키 + JWT (클라이언트 localStorage 저장 금지)
- **인가**: RBAC (역할 기반 접근 제어) 미들웨어
- **AI 보안**: LLM API 키 서버 전용, 프롬프트 인젝션 방어 (사용자 입력 새니타이즈)

### 5. 디자인 레시피 선택

- **Recipe 2 (풀스택 웹앱)** → frontend-design 적용
- shadcn/ui + glassmorphism 기반 엔터프라이즈 UI
- CSS 변수 접두사: `--app-*` (Tailwind v4 충돌 방지)
