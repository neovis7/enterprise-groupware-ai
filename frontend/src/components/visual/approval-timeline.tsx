'use client';

import { CheckCircle, XCircle, Clock, MinusCircle } from 'lucide-react';
import type { Approval } from '@/types/api-contracts';

// ─── 타입 ──────────────────────────────────────────────────────────────────

type ApprovalLineStatus = 'waiting' | 'approved' | 'rejected';

interface ApprovalLineItem {
  order: number;
  userId: string;
  name: string;
  position?: string | null;
  status: ApprovalLineStatus;
  comment?: string | null;
  processedAt?: string | null;
}

interface ApprovalTimelineProps {
  /** 결재선 항목 배열 */
  approvalLine: ApprovalLineItem[];
  /** 현재 활성화된 결재자 인덱스 (0-based) */
  currentStep?: number;
  /** 추가 CSS 클래스 */
  className?: string;
}

// ─── 상수 ─────────────────────────────────────────────────────────────────

const STATUS_META: Record<
  ApprovalLineStatus,
  {
    icon: React.ComponentType<{ size?: number; 'aria-hidden'?: boolean }>;
    label: string;
    dotDataAttr: string;
    badgeClass: string;
    connectorColor: string;
  }
> = {
  waiting: {
    icon: Clock,
    label: '대기중',
    dotDataAttr: 'pending',
    badgeClass: 'app-badge-pending',
    connectorColor: 'var(--border)',
  },
  approved: {
    icon: CheckCircle,
    label: '승인',
    dotDataAttr: 'approved',
    badgeClass: 'app-badge-approved',
    connectorColor: 'var(--app-status-approved)',
  },
  rejected: {
    icon: XCircle,
    label: '반려',
    dotDataAttr: 'rejected',
    badgeClass: 'app-badge-rejected',
    connectorColor: 'var(--app-status-rejected)',
  },
};

// ─── 서브 컴포넌트 ─────────────────────────────────────────────────────────

function AvatarInitial({ name, isCurrent }: { name: string; isCurrent: boolean }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <span
      aria-hidden="true"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '2rem',
        height: '2rem',
        borderRadius: '50%',
        background: isCurrent ? 'var(--app-brand-primary)' : 'var(--muted)',
        color: isCurrent ? 'white' : 'var(--muted-foreground)',
        fontSize: '0.6875rem',
        fontWeight: 600,
        flexShrink: 0,
        boxShadow: isCurrent
          ? '0 0 0 3px var(--app-brand-primary-light)'
          : 'none',
        transition: 'box-shadow var(--app-transition-normal)',
      }}
    >
      {initials}
    </span>
  );
}

function ConnectorLine({
  status,
  isLast,
}: {
  status: ApprovalLineStatus;
  isLast: boolean;
}) {
  if (isLast) return null;
  const color = STATUS_META[status].connectorColor;

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        left: '15px',
        top: '32px',
        bottom: 0,
        width: '2px',
        background: color,
        transition: 'background var(--app-transition-slow)',
      }}
    />
  );
}

function TimelineStep({
  item,
  isCurrent,
  isLast,
  animationDelay,
}: {
  item: ApprovalLineItem;
  isCurrent: boolean;
  isLast: boolean;
  animationDelay: number;
}) {
  const meta = STATUS_META[item.status];
  const Icon = meta.icon;

  const formattedDate =
    item.processedAt
      ? new Intl.DateTimeFormat('ko-KR', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }).format(new Date(item.processedAt))
      : null;

  return (
    <li
      role="listitem"
      aria-label={`${item.order}단계: ${item.name} — ${meta.label}`}
      aria-current={isCurrent ? 'step' : undefined}
      style={{
        position: 'relative',
        display: 'flex',
        gap: '0.75rem',
        paddingBottom: isLast ? 0 : '1.5rem',
        animation: 'app-fade-in 200ms ease both',
        animationDelay: `${animationDelay}ms`,
      }}
    >
      {/* 연결선 */}
      <ConnectorLine status={item.status} isLast={isLast} />

      {/* 상태 도트 */}
      <div
        className="app-timeline-dot"
        data-status={meta.dotDataAttr}
        aria-hidden="true"
        style={{
          boxShadow: isCurrent
            ? `0 0 0 3px var(--app-status-${meta.dotDataAttr}-border)`
            : 'none',
        }}
      >
        <Icon size={14} aria-hidden />
      </div>

      {/* 콘텐츠 */}
      <div style={{ flex: 1, minWidth: 0, paddingTop: '0.375rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            flexWrap: 'wrap',
          }}
        >
          <AvatarInitial name={item.name} isCurrent={isCurrent} />

          <div style={{ minWidth: 0 }}>
            <p
              style={{
                fontSize: 'var(--app-text-body)',
                fontWeight: isCurrent ? 600 : 400,
                color: 'var(--foreground)',
                lineHeight: 'var(--app-leading-caption)',
                margin: 0,
              }}
            >
              {item.name}
            </p>
            {item.position && (
              <p
                style={{
                  fontSize: 'var(--app-text-caption)',
                  color: 'var(--muted-foreground)',
                  margin: 0,
                }}
              >
                {item.position}
              </p>
            )}
          </div>

          {/* 상태 배지 */}
          <span
            className={meta.badgeClass}
            style={{
              fontSize: 'var(--app-text-overline)',
              fontWeight: 600,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              borderRadius: 'var(--app-radius-pill)',
              padding: '0.125rem 0.5rem',
              marginLeft: 'auto',
            }}
          >
            {meta.label}
          </span>
        </div>

        {/* 코멘트 */}
        {item.comment && (
          <blockquote
            style={{
              marginTop: '0.5rem',
              marginLeft: 0,
              paddingLeft: '0.75rem',
              borderLeft: '2px solid var(--border)',
              fontSize: 'var(--app-text-caption)',
              color: 'var(--muted-foreground)',
              fontStyle: 'normal',
            }}
          >
            {item.comment}
          </blockquote>
        )}

        {/* 처리 일시 */}
        {formattedDate && (
          <time
            dateTime={item.processedAt ?? undefined}
            style={{
              display: 'block',
              marginTop: '0.25rem',
              fontSize: 'var(--app-text-overline)',
              color: 'var(--muted-foreground)',
            }}
          >
            {formattedDate}
          </time>
        )}
      </div>
    </li>
  );
}

// ─── 메인 컴포넌트 ─────────────────────────────────────────────────────────

/**
 * ApprovalTimeline — 결재선 단계별 시각화
 *
 * 토큰 참조: --app-status-*, --app-timeline-*, --app-glass-*
 * ARIA: role="list" + listitem + aria-current="step"
 */
export function ApprovalTimeline({
  approvalLine,
  currentStep,
  className,
}: ApprovalTimelineProps) {
  if (approvalLine.length === 0) {
    return (
      <div
        role="status"
        aria-label="결재선 없음"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '1rem',
          color: 'var(--muted-foreground)',
          fontSize: 'var(--app-text-caption)',
        }}
      >
        <MinusCircle size={16} aria-hidden />
        결재선이 없습니다.
      </div>
    );
  }

  return (
    <ol
      role="list"
      aria-label="결재 진행 단계"
      className={className}
      style={{ listStyle: 'none', margin: 0, padding: 0 }}
    >
      {approvalLine.map((item, index) => (
        <TimelineStep
          key={item.userId + item.order}
          item={item}
          isCurrent={currentStep === index}
          isLast={index === approvalLine.length - 1}
          animationDelay={index * 80}
        />
      ))}
    </ol>
  );
}

// ─── Approval 타입 어댑터 ──────────────────────────────────────────────────

/**
 * API 계약의 Approval.approvalLine 배열을 컴포넌트 props 형태로 변환합니다.
 * 사용자 이름/직위는 별도로 조인해야 하므로 userMap을 받습니다.
 */
export function buildApprovalLineItems(
  approvalLine: Approval['approvalLine'],
  userMap: Record<string, { name: string; position?: string | null }>
): ApprovalLineItem[] {
  return approvalLine.map((line) => ({
    order: line.order,
    userId: line.userId,
    name: userMap[line.userId]?.name ?? line.userId,
    position: userMap[line.userId]?.position,
    status: line.status,
    comment: line.comment,
    processedAt: line.processedAt,
  }));
}
