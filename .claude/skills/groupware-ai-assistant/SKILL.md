---
name: groupware-ai-assistant
description: |
  그룹웨어 AI 어시스턴트 기능을 구현하고 운영합니다. LLM 기반 AI 어시스턴트 API(SSE 스트리밍),
  RAG 기반 사내 문서 검색(pgvector), 결재문서 초안 자동 생성, AI 일정 추천을 포함합니다.
  다음 상황에서 반드시 이 스킬을 사용합니다: AI 어시스턴트 질의-응답 구현, LLM API 연동,
  벡터 검색(pgvector) 구현, 프롬프트 엔지니어링, SSE 스트리밍 API 구현,
  결재 초안 자동 생성, 사내 문서 검색 기능 구현.
origin: ax
domain: code/fullstack
dependencies:
  - ai-integration-engineer
  - backend-developer
---

# Groupware AI Assistant Skill

그룹웨어의 AI 기능 구현 가이드입니다. 사내 문서 검색부터 AI 어시스턴트 대화까지,
엔터프라이즈 환경에서 안전하고 신뢰할 수 있는 AI 기능을 구축합니다.

## When to Activate

- AI 어시스턴트 질의-응답 API 구현 시
- RAG(Retrieval-Augmented Generation) 파이프라인 구축 시
- LLM API(Anthropic/OpenAI) 통합 시
- SSE(Server-Sent Events) 스트리밍 응답 구현 시
- 결재문서 초안 자동 생성 기능 구현 시
- AI 기반 일정 추천 기능 구현 시
- 사내 문서 임베딩 및 벡터 검색 구현 시

## Core Rules

### 1. 보안이 최우선

LLM API 키는 절대 클라이언트에 노출되지 않습니다.
모든 AI 요청은 서버를 통해 프록시됩니다.

```typescript
// ❌ 클라이언트에서 직접 호출
const openai = new OpenAI({ apiKey: process.env.NEXT_PUBLIC_OPENAI_KEY });

// ✅ 서버 API를 통해 프록시
const response = await fetch('/api/ai/sessions/:id/messages', { method: 'POST' });
```

### 2. Provider 추상화 (교체 가능 구조)

특정 LLM Provider에 종속되지 않습니다.
비즈니스 요구사항 변화 시 Provider를 교체할 수 있어야 합니다.

```typescript
// AIProvider 인터페이스 — src/lib/llm/provider.ts
interface AIProvider {
  stream(prompt: string, context: RAGContext[]): AsyncIterable<string>;
  complete(prompt: string, context: RAGContext[]): Promise<string>;
}

class AnthropicProvider implements AIProvider { ... }
class OpenAIProvider implements AIProvider { ... }
```

### 3. RAG — 관련 문서만 컨텍스트에 주입

전체 사내 문서를 컨텍스트에 넣으면 토큰 비용이 폭증하고 품질이 저하됩니다.
pgvector 유사도 검색으로 관련 문서 상위 3-5개만 주입합니다.

```typescript
// src/lib/rag/search.ts
async function searchRelevantDocs(query: string, topK = 5): Promise<RAGContext[]> {
  const embedding = await embeddingProvider.embed(query);
  return db.$queryRaw`
    SELECT id, title, excerpt,
           1 - (embedding <=> ${embedding}::vector) AS similarity
    FROM documents
    ORDER BY embedding <=> ${embedding}::vector
    LIMIT ${topK}
  `;
}
```

### 4. SSE 스트리밍 — done 신호 필수

스트리밍 도중 에러가 발생해도 반드시 `done: true`를 전송합니다.
클라이언트가 응답 종료를 알 수 있어야 로딩 상태를 해제할 수 있습니다.

```typescript
try {
  for await (const chunk of aiProvider.stream(content, sources)) {
    res.write(`data: ${JSON.stringify({ chunk, done: false })}\n\n`);
  }
  res.write(`data: ${JSON.stringify({ done: true, sources })}\n\n`);
} catch (error) {
  res.write(`data: ${JSON.stringify({ done: true, error: '응답 생성 실패' })}\n\n`);
} finally {
  res.end();
}
```

### 5. 소스 투명성 — sources[] 항상 반환

AI 답변의 근거를 사용자에게 공개합니다.
출처 없는 AI 답변은 신뢰도가 낮아 엔터프라이즈 환경에서 수용되기 어렵습니다.

### 6. 프롬프트 인젝션 방지

사용자 입력을 시스템 프롬프트와 분리합니다.

```typescript
const messages = [
  { role: 'system', content: SYSTEM_PROMPT },  // 고정 시스템 프롬프트
  ...conversationHistory,                        // 이전 대화 이력
  { role: 'user', content: sanitize(userInput) } // 새니타이즈된 사용자 입력
];
```

## Process

### 실행 전 확인

1. `src/types/api-contracts.ts`의 `AIQuerySchema`, `AIResponseSchema`, `AISessionSchema` 확인
2. `docs/user-flows.md` 플로우 3 (AI 어시스턴트 질의-응답) 확인
3. `.omc/ax/crud-checklists.json`의 AIQuery 체크리스트 확인

### 구현 순서

**Step 1: LLM Provider 추상화 레이어**
```
src/lib/llm/
  provider.ts         # AIProvider 인터페이스
  anthropic.ts        # AnthropicProvider 구현
  openai.ts           # OpenAIProvider 구현 (선택)
  index.ts            # 환경변수 기반 Provider 선택
```

**Step 2: RAG 파이프라인**
```
src/lib/rag/
  embed.ts            # 텍스트 → 임베딩 변환
  search.ts           # pgvector 유사도 검색
  index.ts            # 문서 인덱싱 (배치 처리)
```

pgvector 설정:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
ALTER TABLE documents ADD COLUMN embedding vector(1536);
CREATE INDEX ON documents USING ivfflat (embedding vector_cosine_ops);
```

**Step 3: AI 세션/메시지 라우트**
```
POST /api/ai/sessions              # 새 세션 생성
GET  /api/ai/sessions              # 세션 목록
POST /api/ai/sessions/:id/messages # 질의 전송 (SSE 스트리밍)
GET  /api/ai/sessions/:id/messages # 세션 이력 조회
```

**Step 4: 결재 초안 생성**
```
POST /api/ai/drafts/approval       # 결재 유형별 초안 생성
```
프롬프트 템플릿:
- `vacation`: 휴가 신청서 템플릿
- `expense`: 비용 처리 신청서
- `business_trip`: 출장 신청서
- `general`: 일반 품의서

**Step 5: AI 일정 추천**
```
GET /api/ai/schedule/recommend     # 미팅 최적 시간대 추천
```

**Step 6: 프론트엔드 AI 패널**
- SSE 스트리밍 수신: `EventSource` API 또는 `fetch` + `ReadableStream`
- 타이핑 애니메이션: chunk를 받을 때마다 `requestAnimationFrame`으로 렌더링
- 소스 카드: `sources[]` 배열을 접이식 패널로 표시

## Anti-Patterns

- ❌ LLM API 키를 `NEXT_PUBLIC_*` 환경변수로 설정 → ✅ 서버 전용 환경변수
- ❌ 사내 전체 문서를 컨텍스트에 주입 → ✅ pgvector 상위 5개만 주입
- ❌ 스트리밍 에러 시 연결만 끊음 → ✅ `done: true + error` 전송 후 종료
- ❌ `sources: []` 빈 배열 반환 → ✅ RAG 검색 결과 항상 포함
- ❌ 단일 Provider 하드코딩 → ✅ AIProvider 인터페이스로 추상화
- ❌ 사용자 입력 직접 시스템 프롬프트에 삽입 → ✅ user 메시지로 분리

## Examples

### 예시 1: AI 어시스턴트 질의

```
사용자: "이번 주 결재 대기 건을 요약해줘"
→ ai-integration-engineer 에이전트 활성화
→ RAG 검색: "결재 대기" 관련 문서 검색
→ LLM API 스트리밍 호출
→ SSE 응답: { chunk: "이번 주...", done: false }
→ SSE 완료: { done: true, sources: [...] }
```

### 예시 2: 결재 초안 자동 생성

```
사용자: "5월 제주 출장 결재 초안 만들어줘"
→ POST /api/ai/drafts/approval { type: "business_trip", context: "5월 제주 출장" }
→ business_trip 프롬프트 템플릿 + LLM 호출
→ 결재 기안 폼에 초안 자동 채우기
```
