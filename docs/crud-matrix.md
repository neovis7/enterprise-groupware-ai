# CRUD 완성도 매트릭스

> AI 기능 중심 대기업 그룹웨어 — 필수 구현 기능 목록

---

## 엔티티별 기능 목록

| 엔티티 | 작업 | 백엔드 API | 프론트 페이지/컴포넌트 | 메뉴 | 역할 | 필수 |
|--------|------|-----------|---------------------|------|------|------|
| **User** | Create | POST /api/users | AdminUsersPage (모달) | 조직관리 > 사용자 | admin | O |
| **User** | Read (목록) | GET /api/users | AdminUsersPage (테이블) | 조직관리 > 사용자 | admin | O |
| **User** | Read (상세) | GET /api/users/:id | UserProfilePage | - | admin/self | O |
| **User** | Update | PUT /api/users/:id | AdminUsersPage (모달) | 조직관리 > 사용자 | admin/self | O |
| **User** | Delete | DELETE /api/users/:id | AdminUsersPage (버튼+확인) | 조직관리 > 사용자 | admin | O |
| **Department** | Create | POST /api/departments | AdminDepartmentsPage (모달) | 조직관리 > 부서 | admin | O |
| **Department** | Read (목록) | GET /api/departments | AdminDepartmentsPage (트리) | 조직관리 > 부서 | admin | O |
| **Department** | Update | PUT /api/departments/:id | AdminDepartmentsPage (모달) | 조직관리 > 부서 | admin | O |
| **Department** | Delete | DELETE /api/departments/:id | AdminDepartmentsPage (버튼+확인) | 조직관리 > 부서 | admin | O |
| **Approval** | Create | POST /api/approvals | ApprovalComposePage | 결재함 > 기안 | employee | O |
| **Approval** | Read (목록/내기안) | GET /api/approvals?status=mine | ApprovalInboxPage | 결재함 | employee | O |
| **Approval** | Read (목록/처리대기) | GET /api/approvals?status=pending&assignee=me | ApprovalPendingPage | 결재함 > 수신함 | employee | O |
| **Approval** | Read (상세) | GET /api/approvals/:id | ApprovalDetailPage | - | employee | O |
| **Approval** | Update (처리) | PUT /api/approvals/:id/process | ApprovalDetailPage (승인/반려 버튼) | 결재함 | employee | O |
| **Schedule** | Create | POST /api/schedules | SchedulePage (모달) | 일정 | employee | O |
| **Schedule** | Read (목록) | GET /api/schedules | SchedulePage (달력/목록) | 일정 | employee | O |
| **Schedule** | Read (상세) | GET /api/schedules/:id | ScheduleDetailModal | - | employee | O |
| **Schedule** | Update | PUT /api/schedules/:id | SchedulePage (모달) | 일정 | employee/organizer | O |
| **Schedule** | Delete | DELETE /api/schedules/:id | SchedulePage (버튼+확인) | 일정 | employee/organizer | O |
| **Schedule** | Respond | PUT /api/schedules/:id/respond | ScheduleDetailModal (수락/거절) | 일정 | invitee | O |
| **Post** | Create | POST /api/posts | PostsAdminPage (에디터) | 공지사항 > 작성 | admin/manager | O |
| **Post** | Read (목록) | GET /api/posts | PostsPage (목록) | 공지사항 | employee | O |
| **Post** | Read (상세) | GET /api/posts/:id | PostDetailPage | - | employee | O |
| **Post** | Update | PUT /api/posts/:id | PostsAdminPage (에디터) | 공지사항 > 관리 | admin/manager | O |
| **Post** | Delete | DELETE /api/posts/:id | PostsAdminPage (버튼+확인) | 공지사항 > 관리 | admin | O |
| **Message** | Create | POST /api/messages | MessagingPage (입력창) | 메시지 | employee | O |
| **Message** | Read (목록) | GET /api/messages/:roomId | MessagingPage (채팅창) | 메시지 | employee | O |
| **AIQuery** | Create | POST /api/ai/sessions/:id/messages | AIAssistantPanel (입력창) | AI 어시스턴트 | employee | O |
| **AIQuery** | Read (세션 목록) | GET /api/ai/sessions | AIAssistantPanel (사이드바) | AI 어시스턴트 | employee | O |
| **Notification** | Read (목록) | GET /api/notifications | NotificationDropdown | 헤더 (전역) | employee | O |
| **Notification** | Update (읽음) | PUT /api/notifications/:id/read | NotificationDropdown (항목 클릭) | 헤더 (전역) | employee | O |

---

## 네비게이션 메뉴 목록

| 메뉴명 | 경로 | 역할 | 포함 엔티티 |
|--------|------|------|-----------|
| 대시보드 | /dashboard | all | Approval, Schedule, Notification |
| 결재함 | /approvals | all | Approval |
| 결재함 > 기안 | /approvals/compose | employee | Approval |
| 결재함 > 수신함 | /approvals/inbox | employee | Approval |
| 메시지 | /messages | all | Message |
| 일정 | /schedule | all | Schedule |
| 공지사항 | /posts | all | Post |
| 공지사항 > 관리 | /posts/admin | admin/manager | Post |
| AI 어시스턴트 | /ai | all | AIQuery |
| 조직관리 > 사용자 | /admin/users | admin | User |
| 조직관리 > 부서 | /admin/departments | admin | Department |
| 시스템설정 | /admin/settings | admin | - |

---

## 검증 규칙

- "필수=O"인 모든 행은 백엔드 API + 프론트 페이지/컴포넌트 + 메뉴(또는 접근 경로)가 모두 구현되어야 완료 판정
- hooks만 정의하고 컴포넌트에서 미사용 → 불완전
- 백엔드 API만 있고 프론트 UI 없음 → 불완전
- 메뉴/경로에 없어 사용자 접근 불가 → 불완전
