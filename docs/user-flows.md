# 사용자 플로우 시나리오

> AI 기능 중심 대기업 그룹웨어 — 핵심 10대 플로우 (인터뷰 보강: 2026-04-16)

---

## 플로우 1: 로그인 / SSO 인증

### 시퀀스
1. `GET /` → 미인증 → `/login` 리다이렉트
2. 사용자: ID/PW 입력 or SSO 버튼 클릭
3. `POST /api/auth/login` → `{ email, password }`
   - 응답: `{ accessToken, refreshToken, user: { id, name, department, role } }`
   - accessToken: httpOnly 쿠키 저장 (15분)
   - refreshToken: httpOnly 쿠키 저장 (7일)
4. `/dashboard` 리다이렉트
5. 페이지 새로고침 → `POST /api/auth/refresh` → 새 accessToken 발급
6. 로그아웃: `POST /api/auth/logout` → 쿠키 삭제 → `/login`

### 필수 데이터 필드
- 요청: `email(string)`, `password(string)`
- 응답: `accessToken(string)`, `user.id(string)`, `user.role(admin|employee)`

---

## 플로우 2: 결재 기안 → 처리 → 조회

### 시퀀스
1. 기안자: `GET /api/approvals?status=mine` → 내 결재 목록 조회
2. 기안 작성: `POST /api/approvals` → `{ title, content, type, approverIds[], attachments[] }`
   - 응답: `{ id, status: "pending", approvalLine: [...] }`
3. 결재자 알림 자동 발송: `POST /api/notifications` (서버 내부)
4. 결재자: `GET /api/approvals?status=pending&assignee=me` → 대기 결재 조회
5. 결재 처리: `PUT /api/approvals/:id/process` → `{ action: "approve"|"reject", comment }`
   - 응답: `{ id, status: "approved"|"rejected", updatedAt }`
6. 기안자 알림 수신
7. `GET /api/approvals/:id` → 결재 상세(결재선, 의견, 이력) 조회

### 상태 전이
- `pending` → `approved` | `rejected`

### 필수 데이터 필드
- 결재 생성: `title`, `content`, `type`, `approverIds`
- 결재 처리: `action(approve|reject)`, `comment`
- 결재 상세: `id`, `status`, `approvalLine[]`, `history[]`

---

## 플로우 3: AI 어시스턴트 질의-응답

### 시퀀스
1. 사용자: AI 어시스턴트 패널 열기 → `GET /api/ai/sessions` → 이전 대화 목록
2. 새 대화 시작: `POST /api/ai/sessions` → `{ sessionId }`
3. 질의 전송: `POST /api/ai/sessions/:sessionId/messages`
   - 요청: `{ content: "이번 주 결재 대기 건 요약해줘" }`
   - 응답: SSE 스트리밍 `{ chunk, done }`
4. 사내 문서 검색 연동: AI가 RAG 검색 → `GET /api/documents/search?q=...` 자동 호출
5. 답변 완료 시 `{ messageId, content, sources: [...] }` 반환
6. 사용자: 후속 질의 반복 (세션 내 문맥 유지)

### 필수 데이터 필드
- 질의: `sessionId`, `content`
- 응답: `chunk(streaming)`, `sources[]`, `done(boolean)`

---

## 플로우 4: 일정 등록 → 초대 → 참석 확인

### 시퀀스
1. `GET /api/schedules?year=2026&month=4` → 월별 일정 목록
2. 일정 생성: `POST /api/schedules`
   - 요청: `{ title, startAt, endAt, location, attendeeIds[], isOnline }`
   - 응답: `{ id, title, attendees: [{ userId, status: "invited" }] }`
3. 초대받은 사용자 알림 수신
4. 참석 응답: `PUT /api/schedules/:id/respond` → `{ response: "accept"|"decline" }`
5. `GET /api/schedules/:id` → 참석자 현황 조회

### 필수 데이터 필드
- 일정 생성: `title`, `startAt`, `endAt`, `attendeeIds`
- 참석 응답: `response(accept|decline)`

---

## 플로우 5: 공지사항 등록 → 확인

### 시퀀스
1. 관리자: `POST /api/posts` → `{ title, content, targetDepartments[], isPinned, attachments[] }`
   - 응답: `{ id, status: "published" }`
2. 대상 부서 직원 알림 자동 발송
3. 일반 사용자: `GET /api/posts?type=notice&page=1` → 공지 목록
4. 공지 읽음 처리: `PUT /api/posts/:id/read`
5. `GET /api/posts/:id` → 공지 상세 + 첨부파일 조회

### 필수 데이터 필드
- 공지 생성: `title`, `content`, `targetDepartments`
- 공지 목록: `id`, `title`, `createdAt`, `isRead`

---

## 플로우 6: 근태 체크인 → 휴가 신청 → 승인

### 시퀀스
1. 출근 시 체크인: `POST /api/attendance/checkin` → `{ checkedInAt }`
2. 퇴근 시 체크아웃: `POST /api/attendance/checkout` → `{ checkedOutAt, totalHours }`
3. 월별 근태 조회: `GET /api/attendance?year=2026&month=4` → 달력 뷰
4. 휴가 신청: `POST /api/leaves` → `{ type, startDate, endDate, reason }`
   - 응답: `{ id, status: "pending" }`
5. 결재자(팀장) 알림 수신 → 승인: `PUT /api/leaves/:id/process` → `{ action: "approve" }`
6. 신청자 알림 수신 → 상태 갱신

### 필수 데이터 필드
- 체크인: `userId`, `checkedInAt`
- 휴가 신청: `type(annual|sick|special)`, `startDate`, `endDate`
- 승인 처리: `action(approve|reject)`, `comment`

---

## 플로우 7: 파일 업로드 → 팀 공유

### 시퀀스
1. 폴더 목록: `GET /api/folders` → 트리 구조
2. 파일 업로드: `POST /api/files` → multipart/form-data
   - Supabase Storage 업로드 → `{ id, name, url, size }`
3. 파일 공유: 팀원이 `GET /api/files?folderId=...` → 목록 조회
4. 다운로드: `GET /api/files/:id/download` → 서명된 URL 반환
5. 삭제: `DELETE /api/files/:id` (소유자 또는 admin만)

### 필수 데이터 필드
- 업로드: `name`, `folderId`, `file(binary)`
- 목록: `id`, `name`, `size`, `createdAt`, `ownerName`

---

## 플로우 8: 프로젝트 생성 → 태스크 배정 → 완료

### 시퀀스
1. 프로젝트 생성: `POST /api/projects` → `{ id, name, memberIds[] }`
2. 태스크 생성: `POST /api/projects/:id/tasks`
   - 요청: `{ title, assigneeId, dueDate, priority }`
   - 응답: `{ id, status: "todo" }`
3. 담당자 알림 수신
4. 칸반 이동: `PUT /api/tasks/:id` → `{ status: "in_progress"|"done" }`
5. 프로젝트 현황: `GET /api/projects/:id` → 진행률, 완료/전체 태스크 수

### 상태 전이
`todo` → `in_progress` → `done`

### 필수 데이터 필드
- 태스크 생성: `title`, `assigneeId`, `dueDate`
- 상태 변경: `status`

---

## 플로우 9: 일정 → 화상회의 링크 자동 생성 → AI 회의록

### 시퀀스
1. 일정 생성 시 `isOnline: true` 설정:
   `POST /api/schedules` → `{ id, meetingUrl: "https://meet.google.com/..." }`
   - 서버에서 Google Meet/Zoom API 호출하여 링크 자동 생성
2. 참석자에게 회의 링크 포함 알림 발송
3. 회의 종료 후 AI 회의록 생성 요청:
   `POST /api/ai/sessions/:id/messages` → `{ content: "회의록 생성 요청" }`
   - SSE 스트리밍으로 회의록 반환
4. 회의록 일정에 연결: `PUT /api/schedules/:id` → `{ minutesContent }`

### 필수 데이터 필드
- 온라인 일정: `isOnline: true`, `meetingProvider(google|zoom)`
- 회의록: `scheduleId`, `minutesContent`

---

## 플로우 10: 감사 로그 조회 (Admin)

### 시퀀스
1. Admin: `GET /api/audit/logs?userId=...&action=...&from=...&to=...`
   - 필터: 사용자, 액션 유형, 날짜 범위
   - 응답: `{ logs: [{ userId, action, resource, ip, timestamp }], total }`
2. 특정 사용자 접근 이력: `GET /api/audit/logs?userId=:id`
3. 개인정보 접근 이력: `GET /api/audit/logs?action=personal_data_access`
4. CSV 다운로드: `GET /api/audit/logs/export?format=csv`

### 필수 데이터 필드
- 로그 항목: `userId`, `action`, `resource`, `ip`, `timestamp`, `result(success|fail)`
- 액션 유형: `login`, `logout`, `approval_process`, `file_download`, `personal_data_access`, `admin_action`
