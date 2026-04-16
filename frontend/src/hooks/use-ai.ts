'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import type { AIResponse } from '@/types/api-contracts';

const KEYS = {
  sessions: ['ai-sessions'] as const,
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export function useAISessions() {
  return useQuery({
    queryKey: KEYS.sessions,
    queryFn: async () => {
      const { data } = await apiClient.get('/api/ai/sessions/');
      return data ?? [];
    },
  });
}

export function useCreateAISession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post('/api/ai/sessions/');
      // 백엔드가 { sessionId } 또는 { id } 중 어느 형태로 반환하더라도
      // 항상 id 필드를 보장하여 페이지 코드가 session?.id 로 접근할 수 있게 정규화
      const sessionId = (data as { sessionId?: string; id?: string } | null)?.sessionId;
      if (sessionId && !data?.id) {
        return { ...data, id: sessionId };
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.sessions });
    },
  });
}

interface StreamState {
  content: string;
  sources: AIResponse['sources'];
  isStreaming: boolean;
  error: string | null;
}

/**
 * AI 메시지 SSE 스트리밍 훅
 * POST /api/ai/sessions/:sessionId/messages → SSE stream
 */
export function useAIStream() {
  const [state, setState] = useState<StreamState>({
    content: '',
    sources: [],
    isStreaming: false,
    error: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (sessionId: string, content: string) => {
    // 이전 스트림 중단
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState({ content: '', sources: [], isStreaming: true, error: null });

    try {
      const response = await fetch(
        `${API_URL}/api/ai/sessions/${sessionId}/messages`,
        {
          method: 'POST',
          credentials: 'include',  // httpOnly 쿠키 자동 포함
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream',
          },
          body: JSON.stringify({ content }),
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        throw new Error(`AI 요청 실패: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('스트림을 읽을 수 없습니다.');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (raw === '[DONE]') {
            setState((prev) => ({ ...prev, isStreaming: false }));
            return;
          }
          try {
            const parsed = JSON.parse(raw) as { chunk?: string; done?: boolean; sources?: AIResponse['sources'] };
            if (parsed.chunk) {
              setState((prev) => ({
                ...prev,
                content: prev.content + parsed.chunk,
              }));
            }
            if (parsed.sources) {
              setState((prev) => ({ ...prev, sources: parsed.sources ?? [] }));
            }
            if (parsed.done) {
              setState((prev) => ({ ...prev, isStreaming: false }));
              return;
            }
          } catch {
            // 파싱 불가 라인 무시
          }
        }
      }
    } catch (err: unknown) {
      if ((err as { name?: string })?.name === 'AbortError') return;
      const message = err instanceof Error ? err.message : 'AI 응답 오류가 발생했습니다.';
      setState((prev) => ({ ...prev, isStreaming: false, error: message }));
    }
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setState((prev) => ({ ...prev, isStreaming: false }));
  }, []);

  const reset = useCallback(() => {
    setState({ content: '', sources: [], isStreaming: false, error: null });
  }, []);

  return { ...state, sendMessage, cancel, reset };
}
