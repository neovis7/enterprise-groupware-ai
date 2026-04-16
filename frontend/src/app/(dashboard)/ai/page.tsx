'use client';

import { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  PlusIcon,
  SendIcon,
  SparklesIcon,
  LoaderIcon,
  ExternalLinkIcon,
  XIcon,
} from 'lucide-react';
import { useAISessions, useCreateAISession, useAIStream } from '@/hooks/use-ai';
import { LoadingSkeleton } from '@/components/ui/loading-spinner';
import { ErrorMessage } from '@/components/ui/error-message';
import { EmptyState } from '@/components/ui/empty-state';
import { GLASS, COMPONENT_PATTERNS, ANIMATIONS } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import type { AISession, AIResponse } from '@/types/api-contracts';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: AIResponse['sources'];
  createdAt: Date;
}

export default function AIAssistantPage() {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { data: sessions, isLoading: sessionsLoading, error: sessionsError, refetch: refetchSessions } = useAISessions();
  const { mutateAsync: createSession } = useCreateAISession();
  const { content: streamContent, sources, isStreaming, error: streamError, sendMessage, cancel, reset: resetStream } = useAIStream();

  const sessionList = (sessions as AISession[] | undefined) ?? [];

  // 스트리밍 중 메시지 목록 마지막으로 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamContent]);

  const handleNewSession = async () => {
    const session = await createSession();
    if (session?.id) {
      setSelectedSessionId(session.id);
      setMessages([]);
      resetStream();
      refetchSessions();
    }
  };

  const handleSelectSession = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setMessages([]);
    resetStream();
  };

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;

    let sessionId = selectedSessionId;
    if (!sessionId) {
      const session = await createSession();
      sessionId = session?.id ?? null;
      if (sessionId) {
        setSelectedSessionId(sessionId);
        refetchSessions();
      }
    }
    if (!sessionId) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input,
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    resetStream();

    await sendMessage(sessionId, userMsg.content);

    // 스트리밍 완료 후 assistant 메시지를 히스토리에 추가
    // (streamContent가 최종 값이 됨 — useEffect로 감지)
  };

  // 스트리밍 완료 시 assistant 메시지 히스토리에 추가
  useEffect(() => {
    if (!isStreaming && streamContent) {
      setMessages((prev) => {
        // 이미 동일 내용이 마지막에 있으면 추가하지 않음
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant' && last.content === streamContent) return prev;
        return [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            role: 'assistant',
            content: streamContent,
            sources: sources.length > 0 ? sources : undefined,
            createdAt: new Date(),
          },
        ];
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStreaming]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={cn(GLASS.card, 'flex h-[calc(100vh-8rem)] overflow-hidden')}>
      {/* 세션 사이드바 */}
      <aside
        className="w-56 border-r border-border/50 flex flex-col flex-shrink-0 hidden md:flex"
        aria-label="AI 대화 세션 목록"
      >
        <div className="p-3 border-b border-border/50">
          <button
            onClick={handleNewSession}
            className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <PlusIcon className="h-4 w-4" aria-hidden="true" />
            새 대화
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {sessionsLoading ? (
            <div className="px-3"><LoadingSkeleton rows={4} /></div>
          ) : sessionsError ? (
            <ErrorMessage message="세션 목록 오류" onRetry={() => refetchSessions()} />
          ) : !sessionList.length ? (
            <div className="px-3 py-4 text-center text-xs text-muted-foreground">
              대화 기록이 없습니다.
            </div>
          ) : (
            <ul aria-label="대화 세션 목록">
              {sessionList.map((session) => (
                <li key={session.id}>
                  <button
                    onClick={() => handleSelectSession(session.id)}
                    className={cn(
                      'w-full text-left px-3 py-2.5 text-xs hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      selectedSessionId === session.id && 'bg-primary/10 text-primary',
                    )}
                    aria-current={selectedSessionId === session.id ? 'true' : undefined}
                  >
                    <p className="font-medium truncate">{session.title ?? '새 대화'}</p>
                    {session.lastMessageAt && (
                      <p className="text-muted-foreground mt-0.5">
                        {format(new Date(session.lastMessageAt), 'M/d HH:mm', { locale: ko })}
                      </p>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      {/* 채팅 메인 영역 */}
      <main className="flex-1 flex flex-col min-w-0" aria-label="AI 어시스턴트 채팅">
        {/* 헤더 */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 flex-shrink-0">
          <SparklesIcon className="h-5 w-5 text-primary" aria-hidden="true" />
          <div>
            <h1 className="text-sm font-semibold text-foreground">AI 어시스턴트</h1>
            <p className="text-xs text-muted-foreground">사내 문서 기반 AI 도우미</p>
          </div>
        </div>

        {/* 메시지 목록 */}
        <div
          className="flex-1 overflow-y-auto p-4 space-y-4"
          role="log"
          aria-label="대화 내용"
          aria-live="polite"
        >
          {!selectedSessionId && !messages.length ? (
            <EmptyState
              icon={SparklesIcon}
              title="AI 어시스턴트에게 물어보세요"
              message="결재, 일정, 사내 문서 등 무엇이든 물어보세요. 새 대화를 시작하거나 왼쪽 사이드바에서 이전 대화를 선택하세요."
            />
          ) : (
            <>
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}

              {/* 스트리밍 중인 AI 응답 */}
              {isStreaming && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-muted px-4 py-3">
                    {streamContent ? (
                      <p className="text-sm text-foreground whitespace-pre-wrap">{streamContent}
                        <span className={cn('inline-flex gap-1 ml-1 align-middle', ANIMATIONS.pulseSubtle)} aria-label="AI 응답 생성 중">
                          <span className={COMPONENT_PATTERNS.ai.typingDot} />
                          <span className={COMPONENT_PATTERNS.ai.typingDot} />
                          <span className={COMPONENT_PATTERNS.ai.typingDot} />
                        </span>
                      </p>
                    ) : (
                      <span className="inline-flex gap-1" aria-label="AI 응답 생성 중">
                        <span className={COMPONENT_PATTERNS.ai.typingDot} />
                        <span className={COMPONENT_PATTERNS.ai.typingDot} />
                        <span className={COMPONENT_PATTERNS.ai.typingDot} />
                      </span>
                    )}
                  </div>
                  <button
                    onClick={cancel}
                    className="ml-2 self-end rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="AI 응답 중단"
                  >
                    <XIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              )}

              {streamError && (
                <div role="alert" className="text-sm text-destructive bg-destructive/10 rounded-md p-3">
                  {streamError}
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} aria-hidden="true" />
        </div>

        {/* 입력창 */}
        <div className="p-4 border-t border-border/50 flex-shrink-0">
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="질문을 입력하세요... (Shift+Enter로 줄바꿈)"
              rows={1}
              disabled={isStreaming}
              className="flex-1 resize-none rounded-xl border border-input bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring max-h-32 overflow-y-auto"
              style={{ minHeight: '42px' }}
              aria-label="AI 질문 입력"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
              className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring flex-shrink-0"
              aria-label="전송 (Enter)"
            >
              {isStreaming ? (
                <LoaderIcon className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <SendIcon className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground text-center">
            AI 답변은 참고용이며 정확성을 보장하지 않습니다.
          </p>
        </div>
      </main>
    </div>
  );
}

function MessageBubble({ message }: { readonly message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start', ANIMATIONS.fadeIn)}>
      <div className={cn('max-w-[80%] space-y-2')}>
        <div
          className={cn(
            'rounded-2xl px-4 py-3 text-sm',
            isUser
              ? 'bg-primary text-primary-foreground rounded-br-sm'
              : 'bg-muted text-foreground rounded-bl-sm',
          )}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>

        {/* 소스 카드 (AI 응답에만) */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="space-y-1.5 pl-1" aria-label="참고 문서">
            <p className="text-xs text-muted-foreground font-medium">참고 문서</p>
            {message.sources.map((src) => (
              <div key={src.documentId} className={COMPONENT_PATTERNS.ai.sourceCard}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{src.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{src.excerpt}</p>
                  </div>
                  {src.url && (
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 text-muted-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                      aria-label={`${src.title} 원문 보기`}
                    >
                      <ExternalLinkIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground px-1">
          {format(message.createdAt, 'HH:mm', { locale: ko })}
        </p>
      </div>
    </div>
  );
}
