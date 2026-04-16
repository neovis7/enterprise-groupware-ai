# 시스템 아키텍처

> 생성일: 2026-04-16 | AI 기능 중심 대기업 그룹웨어

---

## 기술 스택

| 레이어 | 기술 | 버전/비고 |
|--------|------|---------|
| **Frontend** | Next.js | 15 (App Router, RSC) |
| | TypeScript | 5.x |
| | shadcn/ui | latest |
| | Tailwind CSS | v4 |
| | Pretendard | 한글 폰트 |
| **Backend** | FastAPI | Python 3.12 |
| | SQLAlchemy | 2.x (async) |
| | Alembic | DB 마이그레이션 |
| | Pydantic | v2 (스키마 검증) |
| **Database** | Supabase | PostgreSQL 16 |
| | pgvector | AI 벡터 검색 |
| | Supabase Storage | 파일 관리 |
| | Redis (Upstash) | 캐시/세션/알림 |
| **Auth** | NextAuth.js | v5 (SSO/SAML/OIDC) |
| | JWT | httpOnly 쿠키, 15분/7일 |
| **AI** | Google Gemini API | gemini-2.0-flash |
| | LangChain | RAG 파이프라인 |
| | pgvector | 벡터 유사도 검색 |
| **Deploy** | Vercel | Next.js 프론트엔드 |
| | Railway | FastAPI 백엔드 |
| **Testing** | pytest + httpx | Backend |
| | Vitest | Frontend 유닛 |
| | Playwright | E2E |

---

## 시스템 구조도

```
┌─────────────────────────────────────────────────────────────┐
│                        클라이언트                             │
│          Next.js 15 App Router (Vercel)                     │
│   Pages: Dashboard / Approvals / Messages / Schedule /       │
│          Posts / AI / Admin / Attendance / Files / Projects  │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTP / SSE
          ┌─────────────┼──────────────┐
          │             │              │
  ┌───────▼──────┐  ┌───▼───────┐  ┌──▼──────────┐
  │ NextAuth.js  │  │ FastAPI   │  │ Supabase    │
  │ (Auth Layer) │  │ (Railway) │  │ Realtime    │
  │ SSO/SAML     │  │ REST API  │  │ (WebSocket) │
  └──────────────┘  └───┬───────┘  └─────────────┘
                        │
          ┌─────────────┼──────────────────┐
          │             │                  │
  ┌───────▼──────┐  ┌───▼───────┐  ┌──────▼──────┐
  │  Supabase    │  │  Redis    │  │ Gemini API  │
  │  PostgreSQL  │  │ (Upstash) │  │ LangChain   │
  │  + pgvector  │  │ Cache/SSE │  │ RAG 파이프라인│
  │  + Storage   │  └───────────┘  └─────────────┘
  └──────────────┘
```

---

## 도메인 모델 (DDD)

```
도메인 1: Identity & Access
  Aggregate: User { id, email, name, role, departmentId }
  Aggregate: Department { id, name, parentId, managerId }

도메인 2: Approval
  Aggregate: Approval { id, title, content, type, status, approverId[] }
  Entity: ApprovalLine { approver, order, action, comment }
  Entity: ApprovalHistory { action, timestamp, comment }
  Value Object: ApprovalStatus (pending|approved|rejected|cancelled)

도메인 3: Communication
  Aggregate: Message { id, roomId, senderId, content, createdAt }
  Aggregate: ChatRoom { id, type, memberIds[] }

도메인 4: Schedule
  Aggregate: Schedule { id, title, startAt, endAt, organizerId, attendees[] }
  Entity: Attendance { userId, response: accept|decline|pending }

도메인 5: Content
  Aggregate: Post { id, title, content, authorId, targetDepts[], isPinned }
  Value Object: PostStatus (draft|published|archived)

도메인 6: AI Assistant
  Aggregate: AISession { id, userId, messages[] }
  Entity: AIMessage { role, content, sources[], createdAt }

도메인 7: Attendance (근태)
  Aggregate: AttendanceRecord { id, userId, date, checkIn, checkOut }
  Aggregate: LeaveRequest { id, userId, type, startDate, endDate, status }

도메인 8: File Management
  Aggregate: FileItem { id, name, path, size, ownerId, folderId }
  Aggregate: Folder { id, name, parentId, teamId }

도메인 9: Project Management
  Aggregate: Project { id, name, description, ownerId, memberIds[] }
  Aggregate: Task { id, title, projectId, assigneeId, status, dueDate }

도메인 10: Audit
  Aggregate: AuditLog { id, userId, action, resource, timestamp, ip }
```

---

## API 설계 (핵심 엔드포인트)

```
Auth
  POST /api/auth/login          로그인
  POST /api/auth/refresh        토큰 갱신
  POST /api/auth/logout         로그아웃
  GET  /api/auth/sso/callback   SSO 콜백

Users & Departments
  GET/POST       /api/users
  GET/PUT/DELETE /api/users/:id
  GET/POST       /api/departments
  GET/PUT/DELETE /api/departments/:id

Approvals
  GET/POST       /api/approvals
  GET            /api/approvals/:id
  PUT            /api/approvals/:id/process

AI Assistant
  GET/POST       /api/ai/sessions
  POST           /api/ai/sessions/:id/messages  (SSE 스트리밍)
  GET            /api/documents/search

Attendance (근태)
  GET/POST       /api/attendance
  POST           /api/attendance/checkin
  POST           /api/attendance/checkout
  GET/POST       /api/leaves
  PUT            /api/leaves/:id/process

Files
  GET/POST       /api/files
  GET/DELETE     /api/files/:id
  GET/POST       /api/folders

Projects & Tasks
  GET/POST       /api/projects
  GET/PUT/DELETE /api/projects/:id
  GET/POST       /api/projects/:id/tasks
  PUT            /api/tasks/:id

Audit
  GET            /api/audit/logs
```

---

## 인증/권한 설계

```
인증 방식: NextAuth.js v5
  - Provider: Credentials (이메일/PW) + SAML (SSO)
  - Token: JWT (accessToken 15분, refreshToken 7일)
  - 저장: httpOnly Secure 쿠키

권한 모델: RBAC (Role-Based Access Control)
  - admin:    전체 접근 + 조직관리 + 시스템설정
  - employee: 결재/메시지/일정/AI/근태/파일/프로젝트

미들웨어: Next.js middleware.ts
  - 인증 필요 경로: /dashboard/*, /approvals/*, /ai/*, ...
  - 역할 필요 경로: /admin/* (admin만)
```

---

## 배포 전략

```
Frontend (Vercel)
  - main 브랜치 → 자동 프로덕션 배포
  - PR 브랜치 → Preview URL 자동 생성
  - 환경변수: NEXTAUTH_SECRET, SUPABASE_URL, NEXT_PUBLIC_API_URL

Backend (Railway)
  - Dockerfile 기반 컨테이너 배포
  - 환경변수: DATABASE_URL, REDIS_URL, GEMINI_API_KEY
  - 헬스체크: GET /health

Database (Supabase)
  - 프로덕션: Supabase 클라우드
  - 개발: supabase start (로컬 Docker)
  - 마이그레이션: alembic upgrade head
```

---

## AI 아키텍처 (RAG 파이프라인)

```
1. 문서 인덱싱
   Upload → Supabase Storage
          → FastAPI 텍스트 추출
          → LangChain 청킹 (512 토큰)
          → Gemini Embeddings API
          → pgvector 저장

2. 질의-응답 (RAG)
   사용자 질의
   → Gemini Embeddings (쿼리 벡터화)
   → pgvector 유사도 검색 (top-k=5)
   → 컨텍스트 조합
   → Gemini API (스트리밍)
   → SSE 청크 전송
   → sources[] 반환

3. 스트리밍 (SSE)
   POST /api/ai/sessions/:id/messages
   → FastAPI StreamingResponse
   → EventSource (클라이언트)
```
