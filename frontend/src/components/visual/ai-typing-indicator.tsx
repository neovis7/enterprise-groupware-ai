'use client';

import { Bot } from 'lucide-react';
import { ANIMATIONS, COMPONENT_PATTERNS } from '@/lib/design-tokens';

// ─── 타입 ──────────────────────────────────────────────────────────────────

interface AITypingIndicatorProps {
  /** 표시 텍스트 (기본값: "AI가 답변을 생성하고 있습니다...") */
  label?: string;
  /** 점 개수 (기본값: 3) */
  dotCount?: 3;
  /** 추가 CSS 클래스 */
  className?: string;
}

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────

/**
 * AITypingIndicator — AI 응답 생성 중 타이핑 애니메이션
 *
 * globals.css의 .app-ai-typing-dot + @keyframes app-ai-bounce 사용.
 * prefers-reduced-motion: 점 애니메이션 대신 정적 점 표시.
 *
 * 토큰 참조: --app-brand-primary, --app-glass-*, --app-text-*
 * ARIA: role="status" + aria-live="polite"
 */
export function AITypingIndicator({
  label = 'AI가 답변을 생성하고 있습니다...',
  className,
}: AITypingIndicatorProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.625rem',
        padding: '0.625rem 0.875rem',
        borderRadius: 'var(--app-radius-lg)',
        background: 'var(--app-glass-bg)',
        backdropFilter: 'var(--app-glass-blur)',
        WebkitBackdropFilter: 'var(--app-glass-blur)',
        border: '1px solid var(--app-glass-border)',
        boxShadow: 'var(--app-shadow-sm)',
      }}
    >
      {/* AI 아이콘 */}
      <span
        aria-hidden="true"
        style={{ color: 'var(--app-brand-primary)', display: 'flex', flexShrink: 0 }}
      >
        <Bot size={15} />
      </span>

      {/* 텍스트 (스크린 리더용, 시각적으로 숨김) */}
      <span className="sr-only">{label}</span>

      {/* 점 애니메이션 */}
      <span
        aria-hidden="true"
        style={{ display: 'flex', alignItems: 'center', gap: '3px' }}
      >
        {/* prefers-reduced-motion은 globals.css의 @keyframes app-ai-bounce 내에서
            미디어 쿼리로 처리할 수 있으나, 인라인 모션 제어를 위해 CSS 변수 트릭 사용 */}
        <style>{`
          @media (prefers-reduced-motion: reduce) {
            .app-ai-typing-dot {
              animation: none !important;
              transform: scale(1) !important;
              opacity: 0.7 !important;
            }
          }
        `}</style>
        <span className={COMPONENT_PATTERNS.ai.typingDot} />
        <span className={COMPONENT_PATTERNS.ai.typingDot} />
        <span className={COMPONENT_PATTERNS.ai.typingDot} />
      </span>

      {/* 시각적 레이블 */}
      <span
        aria-hidden="true"
        style={{
          fontSize: 'var(--app-text-caption)',
          color: 'var(--muted-foreground)',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
    </div>
  );
}

// ─── 스트리밍 텍스트 렌더러 ────────────────────────────────────────────────

interface StreamingTextProps {
  /** SSE 청크로 누적된 현재 텍스트 */
  text: string;
  /** 스트리밍 진행 중 여부 */
  isStreaming: boolean;
  /** 추가 CSS 클래스 */
  className?: string;
}

/**
 * StreamingText — SSE 스트림 청크를 그대로 렌더링합니다.
 *
 * 타이핑 효과는 SSE 서버에서 청크를 보내는 속도 자체로 표현됩니다.
 * 클라이언트에서 setTimeout으로 글자를 순차 출력하지 않으며,
 * 스트림이 끝나기 전까지 AITypingIndicator를 아래에 표시합니다.
 *
 * 사용 예:
 * ```tsx
 * const [text, setText] = useState('');
 * const [isStreaming, setIsStreaming] = useState(false);
 *
 * // SSE 핸들러에서:
 * eventSource.onmessage = (e) => setText((prev) => prev + e.data);
 * eventSource.onerror = () => setIsStreaming(false);
 * ```
 */
export function StreamingText({ text, isStreaming, className }: StreamingTextProps) {
  return (
    <div className={className} aria-live="polite" aria-atomic="false">
      {/* 누적 텍스트 */}
      <p
        style={{
          margin: 0,
          fontSize: 'var(--app-text-body)',
          lineHeight: 'var(--app-leading-body)',
          color: 'var(--foreground)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {text}
      </p>

      {/* 스트리밍 중일 때만 타이핑 인디케이터 표시 */}
      {isStreaming && (
        <div style={{ marginTop: '0.75rem' }}>
          <AITypingIndicator />
        </div>
      )}
    </div>
  );
}
