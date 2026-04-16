'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useApprovals } from '@/hooks/use-approvals';
import { ApprovalStatusBadge } from '@/components/ui/approval-status-badge';
import { LoadingSkeleton } from '@/components/ui/loading-spinner';
import { ErrorMessage } from '@/components/ui/error-message';
import { EmptyState } from '@/components/ui/empty-state';
import { GLASS } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import type { Approval } from '@/types/api-contracts';

export default function ApprovalInboxPage() {
  const { data: approvals, isLoading, error, refetch } = useApprovals({
    status: 'pending',
    assignee: 'me',
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">수신함</h1>
        <p className="text-sm text-muted-foreground mt-0.5">처리 대기 중인 결재 문서입니다.</p>
      </div>

      <div className={cn(GLASS.card, 'p-4')}>
        {isLoading ? (
          <LoadingSkeleton rows={4} />
        ) : error ? (
          <ErrorMessage message="수신함을 불러오지 못했습니다." onRetry={() => refetch()} />
        ) : !(approvals as Approval[] | undefined)?.length ? (
          <EmptyState message="처리 대기 중인 결재 문서가 없습니다." />
        ) : (
          <ul className="divide-y divide-border" aria-label="처리 대기 결재 목록">
            {(approvals as Approval[]).map((appr) => (
              <li key={appr.id}>
                <Link
                  href={`/approvals/${appr.id}`}
                  className="flex items-center justify-between py-3 px-1 rounded-md hover:bg-accent transition-colors group"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate group-hover:text-primary">
                      {appr.title}
                    </p>
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
  );
}
