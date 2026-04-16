'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { PenLineIcon } from 'lucide-react';
import { useApprovals } from '@/hooks/use-approvals';
import { ApprovalStatusBadge } from '@/components/ui/approval-status-badge';
import { LoadingSkeleton } from '@/components/ui/loading-spinner';
import { ErrorMessage } from '@/components/ui/error-message';
import { EmptyState } from '@/components/ui/empty-state';
import { GLASS } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import type { Approval } from '@/types/api-contracts';

type Tab = 'mine' | 'pending';

const APPROVAL_TYPE_LABELS: Record<string, string> = {
  general: '일반',
  expense: '경비',
  vacation: '휴가',
  business_trip: '출장',
  purchase: '구매',
};

export default function ApprovalsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('mine');

  const {
    data: approvals,
    isLoading,
    error,
    refetch,
  } = useApprovals(
    activeTab === 'mine'
      ? { status: 'mine' }
      : { status: 'pending', assignee: 'me' },
  );

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">결재함</h1>
          <p className="text-sm text-muted-foreground mt-0.5">결재 문서를 관리합니다.</p>
        </div>
        <Link
          href="/approvals/compose"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <PenLineIcon className="h-4 w-4" aria-hidden="true" />
          기안하기
        </Link>
      </div>

      {/* 탭 */}
      <div className={cn(GLASS.card, 'p-0 overflow-hidden')}>
        <div className="flex border-b border-border" role="tablist" aria-label="결재함 탭">
          {([
            { id: 'mine', label: '내 기안' },
            { id: 'pending', label: '처리 대기' },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={activeTab === tab.id}
              aria-controls={`tabpanel-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-6 py-3 text-sm font-medium transition-colors border-b-2 -mb-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div
          role="tabpanel"
          id={`tabpanel-${activeTab}`}
          aria-labelledby={`tab-${activeTab}`}
          className="p-4"
        >
          {isLoading ? (
            <LoadingSkeleton rows={4} />
          ) : error ? (
            <ErrorMessage
              message="결재 목록을 불러오지 못했습니다."
              onRetry={() => refetch()}
            />
          ) : !(approvals as Approval[] | undefined)?.length ? (
            <EmptyState
              message={
                activeTab === 'mine'
                  ? '기안한 결재 문서가 없습니다.'
                  : '처리 대기 중인 결재 문서가 없습니다.'
              }
              action={
                activeTab === 'mine' ? (
                  <Link
                    href="/approvals/compose"
                    className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    <PenLineIcon className="h-4 w-4" />
                    기안하기
                  </Link>
                ) : undefined
              }
            />
          ) : (
            <ul className="divide-y divide-border" aria-label="결재 목록">
              {(approvals as Approval[]).map((appr) => (
                <li key={appr.id}>
                  <Link
                    href={`/approvals/${appr.id}`}
                    className="flex items-center justify-between py-3 px-1 rounded-md hover:bg-accent transition-colors group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground bg-muted rounded px-1.5 py-0.5 flex-shrink-0">
                          {APPROVAL_TYPE_LABELS[appr.type] ?? appr.type}
                        </span>
                        <p className="text-sm font-medium text-foreground truncate group-hover:text-primary">
                          {appr.title}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(appr.createdAt), 'yyyy.MM.dd HH:mm', { locale: ko })}
                      </p>
                    </div>
                    <ApprovalStatusBadge status={appr.status} className="ml-3 flex-shrink-0" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
