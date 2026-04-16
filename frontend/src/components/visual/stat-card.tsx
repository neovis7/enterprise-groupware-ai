'use client';

import type { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { GLASS } from '@/lib/design-tokens';

// ─── 타입 ──────────────────────────────────────────────────────────────────

export type TrendDirection = 'up' | 'down' | 'neutral';

export interface StatCardProps {
  /** 통계 레이블 */
  label: string;
  /** 주요 숫자 값 */
  value: number | string;
  /** 숫자 단위 (예: "건", "명", "%") */
  unit?: string;
  /** lucide-react 아이콘 컴포넌트 */
  icon: LucideIcon;
  /** 아이콘 강조 색상 (CSS 변수 참조) */
  iconColor?: string;
  /** 트렌드 방향 */
  trend?: TrendDirection;
  /** 트렌드 텍스트 (예: "전일 대비 +3") */
  trendLabel?: string;
  /** 보조 설명 텍스트 */
  description?: string;
  /** 추가 CSS 클래스 */
  className?: string;
}

// ─── 트렌드 메타 ──────────────────────────────────────────────────────────

const TREND_META: Record<
  TrendDirection,
  {
    icon: LucideIcon;
    color: string;
    ariaLabel: string;
  }
> = {
  up: {
    icon: TrendingUp,
    color: 'var(--app-status-approved)',
    ariaLabel: '증가',
  },
  down: {
    icon: TrendingDown,
    color: 'var(--app-status-rejected)',
    ariaLabel: '감소',
  },
  neutral: {
    icon: Minus,
    color: 'var(--muted-foreground)',
    ariaLabel: '변동 없음',
  },
};

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────

/**
 * StatCard — 대시보드 통계 카드
 *
 * 숫자 + 레이블 + 아이콘 + 선택적 트렌드 표시.
 * glassmorphism 배경 적용.
 *
 * 토큰 참조: --app-glass-*, --app-status-*, --app-text-*
 * ARIA: role="region" + aria-label
 */
export function StatCard({
  label,
  value,
  unit,
  icon: Icon,
  iconColor = 'var(--app-brand-primary)',
  trend,
  trendLabel,
  description,
  className,
}: StatCardProps) {
  const trendMeta = trend ? TREND_META[trend] : null;
  const TrendIcon = trendMeta?.icon;

  const formattedValue =
    typeof value === 'number'
      ? new Intl.NumberFormat('ko-KR').format(value)
      : value;

  return (
    <article
      role="region"
      aria-label={`${label}: ${formattedValue}${unit ?? ''}`}
      className={`${GLASS.card} ${className ?? ''}`}
      style={{ padding: '1.25rem 1.5rem' }}
    >
      {/* 상단: 레이블 + 아이콘 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: '0.75rem',
        }}
      >
        <span
          style={{
            fontSize: 'var(--app-text-caption)',
            fontWeight: 500,
            color: 'var(--muted-foreground)',
            lineHeight: 'var(--app-leading-caption)',
          }}
        >
          {label}
        </span>

        {/* 아이콘 래퍼 */}
        <span
          aria-hidden="true"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '2.25rem',
            height: '2.25rem',
            borderRadius: 'var(--app-radius-md)',
            background: `color-mix(in srgb, ${iconColor} 12%, transparent)`,
            color: iconColor,
            flexShrink: 0,
          }}
        >
          <Icon size={18} aria-hidden />
        </span>
      </div>

      {/* 주요 숫자 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: '0.25rem',
          marginBottom: trendLabel || description ? '0.625rem' : 0,
        }}
      >
        <span
          style={{
            fontSize: 'var(--app-text-h2)',
            fontWeight: 700,
            lineHeight: 'var(--app-leading-h2)',
            color: 'var(--foreground)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {formattedValue}
        </span>
        {unit && (
          <span
            aria-hidden="true"
            style={{
              fontSize: 'var(--app-text-caption)',
              fontWeight: 500,
              color: 'var(--muted-foreground)',
            }}
          >
            {unit}
          </span>
        )}
      </div>

      {/* 트렌드 + 설명 */}
      {(trendMeta || description) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
          }}
        >
          {trendMeta && TrendIcon && (
            <span
              aria-label={trendMeta.ariaLabel}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: 'var(--app-text-overline)',
                fontWeight: 600,
                color: trendMeta.color,
              }}
            >
              <TrendIcon size={12} aria-hidden />
              {trendLabel && (
                <span aria-hidden="true">{trendLabel}</span>
              )}
            </span>
          )}

          {description && (
            <span
              style={{
                fontSize: 'var(--app-text-overline)',
                color: 'var(--muted-foreground)',
              }}
            >
              {description}
            </span>
          )}
        </div>
      )}
    </article>
  );
}
