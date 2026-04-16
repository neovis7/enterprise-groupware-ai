'use client';

import { ArrowRight, CalendarDays, User } from 'lucide-react';
import { GLASS } from '@/lib/design-tokens';

// ─── 타입 ──────────────────────────────────────────────────────────────────

export type TaskPriority = 'high' | 'medium' | 'low';
export type KanbanStatus = 'todo' | 'in_progress' | 'review' | 'done';

export interface KanbanTask {
  id: string;
  title: string;
  assigneeName?: string | null;
  dueDate?: string | null;
  priority: TaskPriority;
  status: KanbanStatus;
}

interface KanbanColumnProps {
  /** 컬럼 상태 */
  status: KanbanStatus;
  /** 컬럼 표시 이름 */
  label: string;
  /** 태스크 목록 */
  tasks: KanbanTask[];
  /** 태스크를 다음 단계로 이동하는 핸들러 */
  onMoveNext?: (taskId: string) => void;
  /** 추가 CSS 클래스 */
  className?: string;
}

// ─── 상수 ─────────────────────────────────────────────────────────────────

const PRIORITY_META: Record<
  TaskPriority,
  { label: string; color: string; bgColor: string; borderColor: string }
> = {
  high: {
    label: '높음',
    color: 'var(--app-status-rejected)',
    bgColor: 'var(--app-status-rejected-bg)',
    borderColor: 'var(--app-status-rejected-border)',
  },
  medium: {
    label: '보통',
    color: 'var(--app-status-pending)',
    bgColor: 'var(--app-status-pending-bg)',
    borderColor: 'var(--app-status-pending-border)',
  },
  low: {
    label: '낮음',
    color: 'var(--app-status-approved)',
    bgColor: 'var(--app-status-approved-bg)',
    borderColor: 'var(--app-status-approved-border)',
  },
};

const STATUS_COLUMN_COLOR: Record<KanbanStatus, string> = {
  todo: 'var(--muted-foreground)',
  in_progress: 'var(--app-brand-primary)',
  review: 'var(--app-status-pending)',
  done: 'var(--app-status-approved)',
};

const NEXT_STATUS: Record<KanbanStatus, KanbanStatus | null> = {
  todo: 'in_progress',
  in_progress: 'review',
  review: 'done',
  done: null,
};

const NEXT_STATUS_LABEL: Record<KanbanStatus, string> = {
  todo: '진행중으로 이동',
  in_progress: '검토중으로 이동',
  review: '완료로 이동',
  done: '',
};

// ─── 태스크 카드 ──────────────────────────────────────────────────────────

function TaskCard({
  task,
  onMoveNext,
}: {
  task: KanbanTask;
  onMoveNext?: (taskId: string) => void;
}) {
  const priority = PRIORITY_META[task.priority];
  const nextStatus = NEXT_STATUS[task.status];
  const nextLabel = NEXT_STATUS_LABEL[task.status];

  const formattedDue = task.dueDate
    ? new Intl.DateTimeFormat('ko-KR', {
        month: 'short',
        day: 'numeric',
      }).format(new Date(task.dueDate))
    : null;

  const isOverdue =
    task.dueDate && task.status !== 'done'
      ? new Date(task.dueDate) < new Date()
      : false;

  return (
    <article
      aria-label={`태스크: ${task.title}, 우선순위: ${priority.label}`}
      className={GLASS.cardSubtle}
      style={{
        padding: '0.75rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        animation: 'app-fade-in 200ms ease both',
      }}
    >
      {/* 우선순위 배지 + 제목 */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
        <span
          aria-label={`우선순위: ${priority.label}`}
          style={{
            fontSize: 'var(--app-text-overline)',
            fontWeight: 600,
            color: priority.color,
            background: priority.bgColor,
            border: `1px solid ${priority.borderColor}`,
            borderRadius: 'var(--app-radius-pill)',
            padding: '0.0625rem 0.375rem',
            flexShrink: 0,
            marginTop: '1px',
          }}
        >
          {priority.label}
        </span>
        <p
          style={{
            margin: 0,
            fontSize: 'var(--app-text-caption)',
            fontWeight: 500,
            color: 'var(--foreground)',
            lineHeight: '1.4',
          }}
        >
          {task.title}
        </p>
      </div>

      {/* 담당자 + 마감일 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
        }}
      >
        {task.assigneeName ? (
          <span
            aria-label={`담당자: ${task.assigneeName}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontSize: 'var(--app-text-overline)',
              color: 'var(--muted-foreground)',
            }}
          >
            <User size={11} aria-hidden />
            {task.assigneeName}
          </span>
        ) : (
          <span />
        )}

        {formattedDue && (
          <time
            dateTime={task.dueDate ?? undefined}
            aria-label={`마감일: ${formattedDue}${isOverdue ? ' (기한 초과)' : ''}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontSize: 'var(--app-text-overline)',
              color: isOverdue ? 'var(--app-status-rejected)' : 'var(--muted-foreground)',
              fontWeight: isOverdue ? 600 : 400,
            }}
          >
            <CalendarDays size={11} aria-hidden />
            {formattedDue}
          </time>
        )}
      </div>

      {/* 다음 단계 이동 버튼 */}
      {nextStatus && onMoveNext && (
        <button
          type="button"
          aria-label={`${task.title} — ${nextLabel}`}
          onClick={() => onMoveNext(task.id)}
          style={{
            alignSelf: 'flex-end',
            background: 'none',
            border: '1px solid var(--border)',
            borderRadius: 'var(--app-radius-sm)',
            cursor: 'pointer',
            padding: '0.25rem 0.5rem',
            fontSize: 'var(--app-text-overline)',
            color: 'var(--muted-foreground)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            transition:
              'color var(--app-transition-fast), border-color var(--app-transition-fast)',
          }}
          onMouseEnter={(e) => {
            const btn = e.currentTarget as HTMLButtonElement;
            btn.style.color = 'var(--app-brand-primary)';
            btn.style.borderColor = 'var(--app-brand-primary)';
          }}
          onMouseLeave={(e) => {
            const btn = e.currentTarget as HTMLButtonElement;
            btn.style.color = 'var(--muted-foreground)';
            btn.style.borderColor = 'var(--border)';
          }}
        >
          <ArrowRight size={11} aria-hidden />
          {nextLabel}
        </button>
      )}
    </article>
  );
}

// ─── 메인 컴포넌트 ─────────────────────────────────────────────────────────

/**
 * KanbanColumn — 칸반 보드 컬럼
 *
 * 토큰 참조: --app-status-*, --app-glass-*, --app-text-*
 * ARIA: role="region" + role="list" + aria-label
 */
export function KanbanColumn({
  status,
  label,
  tasks,
  onMoveNext,
  className,
}: KanbanColumnProps) {
  const columnColor = STATUS_COLUMN_COLOR[status];

  return (
    <section
      role="region"
      aria-label={`${label} 컬럼 (${tasks.length}개)`}
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        minWidth: '240px',
        flex: '1 1 240px',
      }}
    >
      {/* 컬럼 헤더 */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.625rem 0.75rem',
          borderRadius: 'var(--app-radius-md)',
          background: 'var(--app-surface-raised)',
          borderLeft: `3px solid ${columnColor}`,
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: 'var(--app-text-caption)',
            fontWeight: 600,
            color: 'var(--foreground)',
          }}
        >
          {label}
        </h3>
        <span
          aria-label={`${tasks.length}개 태스크`}
          style={{
            fontSize: 'var(--app-text-overline)',
            fontWeight: 700,
            color: columnColor,
            background: 'var(--app-surface-sunken)',
            borderRadius: 'var(--app-radius-pill)',
            padding: '0.125rem 0.5rem',
            minWidth: '20px',
            textAlign: 'center',
          }}
        >
          {tasks.length}
        </span>
      </header>

      {/* 태스크 목록 */}
      <ul
        role="list"
        aria-label={`${label} 태스크 목록`}
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          minHeight: '80px',
        }}
      >
        {tasks.length === 0 ? (
          <li
            role="listitem"
            style={{
              padding: '1.5rem 0.75rem',
              textAlign: 'center',
              color: 'var(--muted-foreground)',
              fontSize: 'var(--app-text-caption)',
              borderRadius: 'var(--app-radius-md)',
              border: '1px dashed var(--border)',
            }}
          >
            태스크 없음
          </li>
        ) : (
          tasks.map((task) => (
            <li key={task.id} role="listitem">
              <TaskCard task={task} onMoveNext={onMoveNext} />
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
