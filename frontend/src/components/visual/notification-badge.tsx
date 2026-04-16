'use client';

import { Bell } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import type { Notification } from '@/types/api-contracts';

// ─── 타입 ──────────────────────────────────────────────────────────────────

interface NotificationBadgeProps {
  /** 미읽음 알림 수 */
  unreadCount: number;
  /** 최근 알림 목록 (드롭다운 표시용) */
  notifications?: Notification[];
  /** 알림 클릭 핸들러 */
  onNotificationClick?: (notification: Notification) => void;
  /** "모두 읽음" 처리 핸들러 */
  onMarkAllRead?: () => void;
  /** 추가 CSS 클래스 */
  className?: string;
}

// ─── 알림 타입별 레이블 ────────────────────────────────────────────────────

const NOTIFICATION_TYPE_LABEL: Record<Notification['type'], string> = {
  approval: '결재',
  schedule: '일정',
  post: '공지',
  message: '메시지',
  system: '시스템',
};

// ─── 뱃지 숫자 포맷 ───────────────────────────────────────────────────────

function formatCount(count: number): string {
  if (count > 99) return '99+';
  return String(count);
}

// ─── 드롭다운 알림 항목 ────────────────────────────────────────────────────

function NotificationItem({
  notification,
  onClick,
}: {
  notification: Notification;
  onClick: (n: Notification) => void;
}) {
  const typeLabel = NOTIFICATION_TYPE_LABEL[notification.type];
  const formattedTime = new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(notification.createdAt));

  return (
    <li role="listitem">
      <button
        type="button"
        onClick={() => onClick(notification)}
        aria-label={`${typeLabel}: ${notification.title}${notification.isRead ? '' : ' (읽지 않음)'}`}
        style={{
          width: '100%',
          textAlign: 'left',
          background: notification.isRead
            ? 'transparent'
            : 'var(--app-status-info-bg)',
          border: 'none',
          borderBottom: '1px solid var(--border)',
          padding: '0.75rem 1rem',
          cursor: 'pointer',
          display: 'flex',
          gap: '0.625rem',
          alignItems: 'flex-start',
          transition: 'background var(--app-transition-fast)',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background =
            'var(--muted)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = notification.isRead
            ? 'transparent'
            : 'var(--app-status-info-bg)';
        }}
      >
        {/* 미읽음 도트 */}
        <span
          aria-hidden="true"
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: notification.isRead ? 'transparent' : 'var(--app-status-info)',
            flexShrink: 0,
            marginTop: '0.375rem',
          }}
        />

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* 타입 뱃지 + 제목 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.25rem' }}>
            <span
              className="app-badge-info"
              style={{
                fontSize: 'var(--app-text-overline)',
                fontWeight: 600,
                borderRadius: 'var(--app-radius-pill)',
                padding: '0.0625rem 0.375rem',
                flexShrink: 0,
              }}
            >
              {typeLabel}
            </span>
            <span
              style={{
                fontSize: 'var(--app-text-caption)',
                fontWeight: notification.isRead ? 400 : 600,
                color: 'var(--foreground)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {notification.title}
            </span>
          </div>

          {/* 본문 */}
          <p
            style={{
              margin: 0,
              fontSize: 'var(--app-text-overline)',
              color: 'var(--muted-foreground)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {notification.body}
          </p>

          {/* 시간 */}
          <time
            dateTime={notification.createdAt}
            style={{
              display: 'block',
              marginTop: '0.25rem',
              fontSize: 'var(--app-text-overline)',
              color: 'var(--muted-foreground)',
            }}
          >
            {formattedTime}
          </time>
        </div>
      </button>
    </li>
  );
}

// ─── 메인 컴포넌트 ─────────────────────────────────────────────────────────

/**
 * NotificationBadge — 헤더 알림 버튼 + 미읽음 뱃지 + 드롭다운
 *
 * 토큰 참조: --app-status-*, --app-glass-*, --app-text-*
 * ARIA: aria-label + aria-expanded + role="list" + aria-live
 */
export function NotificationBadge({
  unreadCount,
  notifications = [],
  onNotificationClick,
  onMarkAllRead,
  className,
}: NotificationBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // 외부 클릭 시 닫기
  useEffect(() => {
    if (!isOpen) return;

    function handleOutsideClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  // Escape 키로 닫기
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleNotificationClick = useCallback(
    (notification: Notification) => {
      onNotificationClick?.(notification);
      setIsOpen(false);
    },
    [onNotificationClick]
  );

  const hasUnread = unreadCount > 0;
  const dropdownId = 'notification-dropdown';

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ position: 'relative', display: 'inline-block' }}
    >
      {/* 알림 버튼 */}
      <button
        ref={buttonRef}
        type="button"
        aria-label={
          hasUnread
            ? `알림 ${unreadCount}개 읽지 않음`
            : '알림 없음'
        }
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-controls={dropdownId}
        onClick={handleToggle}
        style={{
          position: 'relative',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '0.5rem',
          borderRadius: 'var(--app-radius-md)',
          color: 'var(--foreground)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background var(--app-transition-fast)',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = 'var(--muted)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = 'none';
        }}
      >
        <Bell size={20} aria-hidden />

        {/* 미읽음 뱃지 */}
        {hasUnread && (
          <span
            aria-hidden="true"
            data-badge-pulse=""
            style={{
              position: 'absolute',
              top: '2px',
              right: '2px',
              minWidth: '16px',
              height: '16px',
              borderRadius: 'var(--app-radius-pill)',
              background: 'var(--app-status-rejected)',
              color: 'white',
              fontSize: '0.5625rem',
              fontWeight: 700,
              lineHeight: '16px',
              textAlign: 'center',
              padding: '0 3px',
              boxSizing: 'border-box',
              /* 애니메이션: prefers-reduced-motion 고려 */
              animation: 'app-pulse-subtle 2s ease-in-out infinite',
            }}
          >
            <style>{`
              @media (prefers-reduced-motion: reduce) {
                [data-badge-pulse] {
                  animation: none !important;
                }
              }
            `}</style>
            {formatCount(unreadCount)}
          </span>
        )}
      </button>

      {/* 드롭다운 패널 */}
      {isOpen && (
        <div
          id={dropdownId}
          role="dialog"
          aria-label="알림 목록"
          aria-live="polite"
          style={{
            position: 'absolute',
            top: 'calc(100% + 0.5rem)',
            right: 0,
            width: '320px',
            maxHeight: '480px',
            overflowY: 'auto',
            background: 'var(--app-glass-bg)',
            backdropFilter: 'var(--app-glass-blur-heavy)',
            WebkitBackdropFilter: 'var(--app-glass-blur-heavy)',
            border: '1px solid var(--app-glass-border)',
            borderRadius: 'var(--app-radius-xl)',
            boxShadow: 'var(--app-shadow-lg)',
            zIndex: 'var(--app-z-dropdown)',
            animation: 'app-fade-in 200ms ease both',
          }}
        >
          {/* 드롭다운 헤더 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.875rem 1rem 0.75rem',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: 'var(--app-text-body)',
                fontWeight: 600,
                color: 'var(--foreground)',
              }}
            >
              알림
              {hasUnread && (
                <span
                  aria-label={`읽지 않은 알림 ${unreadCount}개`}
                  style={{
                    marginLeft: '0.5rem',
                    fontSize: 'var(--app-text-overline)',
                    fontWeight: 700,
                    color: 'var(--app-status-rejected)',
                    background: 'var(--app-status-rejected-bg)',
                    border: '1px solid var(--app-status-rejected-border)',
                    borderRadius: 'var(--app-radius-pill)',
                    padding: '0.0625rem 0.375rem',
                  }}
                >
                  {formatCount(unreadCount)}
                </span>
              )}
            </h2>

            {hasUnread && onMarkAllRead && (
              <button
                type="button"
                onClick={onMarkAllRead}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 'var(--app-text-caption)',
                  color: 'var(--app-brand-primary)',
                  padding: '0.25rem 0.5rem',
                  borderRadius: 'var(--app-radius-sm)',
                  transition: 'background var(--app-transition-fast)',
                }}
                aria-label="모든 알림 읽음 처리"
              >
                모두 읽음
              </button>
            )}
          </div>

          {/* 알림 목록 */}
          {notifications.length === 0 ? (
            <div
              role="status"
              aria-label="알림 없음"
              style={{
                padding: '2rem 1rem',
                textAlign: 'center',
                color: 'var(--muted-foreground)',
                fontSize: 'var(--app-text-caption)',
              }}
            >
              새 알림이 없습니다.
            </div>
          ) : (
            <ul
              role="list"
              aria-label="알림 항목"
              style={{ listStyle: 'none', margin: 0, padding: 0 }}
            >
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onClick={handleNotificationClick}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
