# 검증 시나리오: AI 기능 중심의 대기업 그룹웨어 (fullstack)

## 생성 정보
- 날짜: 2026-04-16
- 패턴: 계층적 위임 + 생성-검증
- 에이전트 수: 8
- 스킬 수: 1 (groupware-ai-assistant)

## 구조 검증 결과
- [x] 에이전트 frontmatter 유효성: PASS
- [x] 스킬 frontmatter 유효성: PASS
- [x] CLAUDE.md 오케스트레이션 섹션: PASS
- [x] 순환 의존성 없음: PASS
- [x] 에이전트 Examples(Good/Bad) 존재: PASS
- [x] visual-architect → visual-builder → visual-qa 체인: PASS
- [x] CRUD 매트릭스 파일 존재 (docs/crud-matrix.md): PASS
- [x] 스킬 품질 (groupware-ai-assistant): PASS (208줄, ALWAYS/NEVER 0건)

## 시나리오 검증

### 시나리오 1: 결재 워크플로우 API 구현 및 보안 검수
- **작업 설명**: "결재 기안, 처리, 조회 API를 구현하고 보안 검수해줘"
- **예상 에이전트**: backend-developer → code-reviewer
- **예상 흐름**:
  1. backend-developer: `src/types/api-contracts.ts` (CreateApprovalSchema, ProcessApprovalSchema) 확인
  2. backend-developer: `docs/user-flows.md` 플로우 2 확인 (결재 기안-처리-조회)
  3. backend-developer: `docs/crud-matrix.md` 필수=O Approval CRUD 확인
  4. backend-developer: `src/routes/approvals.ts`, `src/services/approval.ts` 구현 + 알림 연동
  5. code-reviewer: SOLID(SRP/DIP) + OWASP(IDOR/인증) + CRUD 완성도 검증
  6. code-reviewer: `_workspace/code-review-report.md` 저장
- **위임 규칙 일치**: YES (백엔드 API 구현 → backend-developer, 코드 검수 → code-reviewer)
- **검증 기준**: IDOR 방지 확인 (GET /approvals/:id에서 authorId 검증), Zod safeParse 적용

### 시나리오 2: AI 어시스턴트 SSE 스트리밍 구현
- **작업 설명**: "사내 문서를 RAG로 검색하고 AI 어시스턴트 응답을 스트리밍으로 제공해줘"
- **예상 에이전트**: ai-integration-engineer → code-reviewer
- **예상 흐름**:
  1. ai-integration-engineer: `src/types/api-contracts.ts` (AIQuerySchema, AIResponseSchema) 확인
  2. ai-integration-engineer: `docs/user-flows.md` 플로우 3 (AI 어시스턴트 질의-응답) 확인
  3. ai-integration-engineer: AIProvider 인터페이스 + AnthropicProvider 구현
  4. ai-integration-engineer: pgvector 기반 RAG 파이프라인 구현 (임베딩 → 유사도 검색)
  5. ai-integration-engineer: SSE 스트리밍 엔드포인트 구현 (`POST /api/ai/sessions/:id/messages`)
  6. code-reviewer: 프롬프트 인젝션 방어, LLM 키 서버 전용 확인, sources[] 반환 검증
- **위임 규칙 일치**: YES (AI 기능 구현 → ai-integration-engineer, 보안 검수 → code-reviewer)
- **검증 기준**: SSE done:true 전송 확인, sources[] 비어있지 않음, API 키 NEXT_PUBLIC 미포함

### 시나리오 3: 결재 타임라인 시각 컴포넌트 전체 파이프라인
- **작업 설명**: "결재 진행 단계를 시각적으로 표현하는 타임라인 컴포넌트를 디자인하고 구현해줘"
- **예상 에이전트**: visual-architect → visual-builder → visual-qa
- **예상 흐름**:
  1. visual-architect: 결재 상태 4종 색상 토큰 정의 (--app-color-approval-*)
  2. visual-architect: `docs/design-system.md` + `src/styles/tokens.css` 저장
  3. visual-builder: `docs/design-system.md` 로드하여 토큰 기반 ApprovalTimeline 구현
  4. visual-builder: lucide-react 아이콘 사용, prefers-reduced-motion 처리
  5. visual-qa: WCAG 2.1 AA 대비율(4.5:1) 검증, AI 슬롭 패턴 탐지, ARIA 속성 확인
  6. visual-qa: `_workspace/visual-qa-report.md` 저장
- **위임 규칙 일치**: YES (디자인 시스템 → visual-architect, 시각 컴포넌트 → visual-builder, UI 검수 → visual-qa)
- **검증 기준**: --app-* 접두사 전용 사용, 이모지 아이콘 0건, 대비율 4.5:1 이상

## 위임 규칙 매핑

| 요청 유형 | 트리거 키워드 | 담당 에이전트 | 후처리 에이전트 |
|---------|------------|-------------|-------------|
| 시스템 아키텍처 설계 | DDD, 도메인 모델, 기술 스택 | system-architect | - |
| 백엔드 API 구현 | API, 결재 API, Prisma, 서버 | backend-developer | code-reviewer |
| AI 기능 구현 | AI, LLM, RAG, pgvector, SSE | ai-integration-engineer | code-reviewer |
| 프론트엔드 UI 구현 | 프론트엔드, shadcn, 컴포넌트 | frontend-developer | visual-qa |
| 디자인 시스템 설계 | 디자인 토큰, glassmorphism | visual-architect | - |
| 시각 컴포넌트 구현 | 타임라인, 조직도, 애니메이션 | visual-builder | visual-qa |
| 코드 검수 | 코드 리뷰, OWASP, SOLID | code-reviewer | - |
| UI 품질 검수 | UI 검수, WCAG, 접근성 | visual-qa | - |
