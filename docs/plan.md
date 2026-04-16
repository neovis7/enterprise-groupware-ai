# 프로젝트 계획서

> 생성일: 2026-04-16 | ax --execute --interview 인터뷰 결과 기반

---

## 프로젝트 개요

- **목적**: AI 기능 중심 대기업 직원용 그룹웨어 구축 — 결재·조직·협업·근태·AI 어시스턴트를 하나의 플랫폼으로 통합
- **사용자**: admin (조직관리·시스템설정), employee (결재·메시지·일정·AI·근태)
- **품질 우선순위**: 사용성(UX) → 정확도(Accuracy) → 보안(Security)

---

## 핵심 기능 (MVP — 10개 기능 그룹)

| # | 기능 그룹 | 핵심 기능 | 우선순위 |
|---|-----------|----------|---------|
| A | 인증/조직 | 로그인(SSO/SAML), 사용자 CRUD, 부서 CRUD | P0 |
| B | 결재 워크플로우 | 기안 작성, 승인/반려, 결재선, 알림 연동 | P0 |
| C | AI 어시스턴트 | LLM 채팅, RAG 문서검색, SSE 스트리밍 | P0 |
| D | 협업 도구 | 메시지(채팅), 일정(달력), 공지사항 | P0 |
| E | 대시보드 | 결재 현황, 일정 요약, 알림 위젯 | P0 |
| F | 근태관리 | 출/퇴근 체크인, 휴가 신청/승인, 월별 현황 | P1 |
| G | 파일·문서 관리 | 팀 드라이브, 파일 업로드/다운로드, 검색 | P1 |
| H | 프로젝트·업무 관리 | 프로젝트 생성, 태스크 배정, 칸반 보드 | P1 |
| I | 화상회의 연동 | 일정 → Zoom/Meet 링크 자동 생성, AI 회의록 | P2 |
| J | 보안·감사 로그 | 전체 액션 감사 로그, 개인정보 접근 이력 | P1 |

---

## 아키텍처 패턴

- **선택 패턴**: Next.js(FE) + FastAPI(BE) 분리 아키텍처
- **매칭 시그널**: AI 기능(Python 생태계 최적화), RAG+pgvector, 10개 도메인, 확장성 필요
- **대안**: Next.js 풀스택 모놀리스 (기각 — AI Python 연동 복잡), NestJS 마이크로서비스 (기각 — 구현 복잡도 과도)

---

## 마일스톤

### M1: 코어 플랫폼 (A+B+E)
- 인증/SSO, 사용자/부서 관리
- 결재 워크플로우 (기안→승인/반려→알림)
- 대시보드 기본 위젯

### M2: AI + 협업 (C+D)
- AI 어시스턴트 (Gemini + RAG + SSE)
- 메시지·일정·공지사항

### M3: 확장 기능 (F+G+H+J)
- 근태관리, 파일 드라이브, 프로젝트 관리, 감사 로그

### M4: 화상회의 + QA (I + 전체 검증)
- 화상회의 연동, AI 회의록
- E2E 스모크 테스트 + OWASP 보안 스캔

---

## 디자인 스킬 조합

- **적용 레시피**: 레시피 2 — 풀스택 엔터프라이즈 UI
- **디자인 엔진**: frontend-design
- **스타일**: shadcn/ui + glassmorphism + Pretendard 폰트
- **테마**: 다크/라이트 모드 모두 지원
- **근거**: code+fullstack+accuracy → 엔터프라이즈 일관성 우선

---

## 기술 결정사항

| 항목 | 결정 | 근거 |
|------|------|------|
| Frontend | Next.js 15 (App Router) | React 서버 컴포넌트, 성능 최적화 |
| Backend | FastAPI (Python) | AI/ML 생태계(Gemini, LangChain, pgvector) 최적 |
| Database | Supabase (PostgreSQL 16 + pgvector) | RLS, 실시간, Storage 통합, pgvector 지원 |
| Auth | NextAuth.js v5 + SSO/SAML | 대기업 IdP 연동 (AD/Okta), httpOnly JWT |
| AI | Google Gemini API + LangChain | RAG 파이프라인, 벡터 검색, 스트리밍 |
| Storage | Supabase Storage | 파일 관리, CDN, 결재 첨부 통합 |
| Cache | Redis (Upstash) | 세션, API 캐시, 실시간 알림 |
| Deploy | Vercel (FE) + Railway (BE) | Supabase 궁합, 무중단 배포 자동화 |
| Testing | pytest + Vitest + Playwright | 유닛+통합+E2E, 커버리지 80%+ |

---

## 품질 기준

- **테스트 전략**: 엄격 (유닛 + 통합 + E2E + 보안 스캔)
- **커버리지 목표**: 80%+
- **보안**: OWASP Top 10 검증 포함
- **테스트 도구**:
  - Backend: pytest + httpx (통합), bandit (보안 스캔)
  - Frontend: Vitest + Testing Library
  - E2E: Playwright (핵심 플로우 — 로그인/결재/AI)
