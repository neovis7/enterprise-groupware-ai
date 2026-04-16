'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { CheckIcon, XIcon, Paperclip, LoaderIcon, ChevronLeftIcon } from 'lucide-react';
import { useApproval, useProcessApproval } from '@/hooks/use-approvals';
import { useAuth } from '@/hooks/use-auth';
import { ApprovalStatusBadge } from '@/components/ui/approval-status-badge';
import { PageLoading } from '@/components/ui/loading-spinner';
import { ErrorMessage } from '@/components/ui/error-message';
import { GLASS, COMPONENT_PATTERNS } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import type { Approval } from '@/types/api-contracts';

export default function ApprovalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { data: approval, isLoading, error, refetch } = useApproval(id);
  const { mutateAsync: processApproval, isPending: isProcessing } = useProcessApproval();
  const [comment, setComment] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  if (isLoading) return <PageLoading />;
  if (error) return <ErrorMessage message="결재 정보를 불러오지 못했습니다." onRetry={() => refetch()} />;
  if (!approval) return <ErrorMessage message="결재 문서를 찾을 수 없습니다." />;

  const appr = approval as Approval;

  // 현재 사용자가 결재자인지 확인
  const myApprovalLine = appr.approvalLine.find(
    (line) => line.userId === user?.id && line.status === 'waiting',
  );
  const canProcess = Boolean(myApprovalLine) && appr.status === 'pending';

  const handleProcess = async (action: 'approve' | 'reject') => {
    setActionError(null);
    try {
      await processApproval({ id: appr.id, action, comment: comment || undefined });
      router.push('/approvals');
    } catch {
      setActionError('결재 처리에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const APPROVAL_TYPE_LABELS: Record<string, string> = {
    general: '일반',
    expense: '경비',
    vacation: '휴가',
    business_trip: '출장',
    purchase: '구매',
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* 뒤로 가기 */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
      >
        <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
        돌아가기
      </button>

      {/* 헤더 */}
      <div className={cn(GLASS.card, 'p-6')}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-muted-foreground bg-muted rounded px-1.5 py-0.5">
                {APPROVAL_TYPE_LABELS[appr.type] ?? appr.type}
              </span>
              <ApprovalStatusBadge status={appr.status} />
            </div>
            <h1 className="text-lg font-semibold text-foreground">{appr.title}</h1>
            <p className="text-xs text-muted-foreground mt-1">
              기안일: {format(new Date(appr.createdAt), 'yyyy.MM.dd HH:mm', { locale: ko })}
            </p>
          </div>
        </div>

        {/* 내용 */}
        <div className="mt-4 rounded-lg bg-muted/30 p-4">
          <p className="text-sm text-foreground whitespace-pre-wrap">{appr.content}</p>
        </div>

        {/* 첨부파일 */}
        {appr.attachments.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium text-foreground">첨부파일</p>
            <ul className="space-y-1">
              {appr.attachments.map((att) => (
                <li key={att.url}>
                  <a
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    <Paperclip className="h-3.5 w-3.5" aria-hidden="true" />
                    {att.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* 결재선 타임라인 */}
      <section className={cn(GLASS.card, 'p-6')} aria-labelledby="approval-line-heading">
        <h2 id="approval-line-heading" className="text-sm font-semibold text-foreground mb-4">결재선</h2>
        <ol className="space-y-4" aria-label="결재선 현황">
          {appr.approvalLine.map((line, index) => (
            <li key={`${line.userId}-${line.order}`} className="relative flex items-start gap-3 pl-2">
              {/* 타임라인 세로선 */}
              {index < appr.approvalLine.length - 1 && (
                <div className={COMPONENT_PATTERNS.timeline.line} aria-hidden="true" />
              )}

              {/* 타임라인 점 */}
              <div
                className={COMPONENT_PATTERNS.timeline.dot}
                data-status={line.status === 'waiting' ? 'pending' : line.status}
                aria-hidden="true"
              >
                {line.status === 'approved' && <CheckIcon className="h-3.5 w-3.5" />}
                {line.status === 'rejected' && <XIcon className="h-3.5 w-3.5" />}
                {line.status === 'waiting' && (
                  <span className="text-xs font-bold">{line.order}</span>
                )}
              </div>

              <div className="flex-1 pt-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">결재자 {line.order}</span>
                  <span className="text-xs text-muted-foreground">({line.userId.slice(0, 8)}...)</span>
                </div>
                {line.comment && (
                  <p className="mt-1 text-sm text-muted-foreground bg-muted/30 rounded p-2">
                    {line.comment}
                  </p>
                )}
                {line.processedAt && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(line.processedAt), 'yyyy.MM.dd HH:mm', { locale: ko })}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* 결재 처리 (결재자인 경우) */}
      {canProcess && (
        <section className={cn(GLASS.card, 'p-6')} aria-labelledby="process-heading">
          <h2 id="process-heading" className="text-sm font-semibold text-foreground mb-4">결재 처리</h2>

          {actionError && (
            <div role="alert" className="mb-4 rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
              {actionError}
            </div>
          )}

          <div className="space-y-3">
            <label htmlFor="comment" className="text-sm font-medium text-foreground">
              의견 (선택)
            </label>
            <textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="결재 의견을 입력하세요 (선택사항)"
              className="w-full rounded-md border border-input px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />

            <div className="flex gap-3">
              <button
                onClick={() => handleProcess('approve')}
                disabled={isProcessing}
                aria-busy={isProcessing}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {isProcessing ? <LoaderIcon className="h-4 w-4 animate-spin" /> : <CheckIcon className="h-4 w-4" />}
                승인
              </button>
              <button
                onClick={() => handleProcess('reject')}
                disabled={isProcessing}
                aria-busy={isProcessing}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-md bg-destructive px-4 py-2 text-sm font-medium text-white hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {isProcessing ? <LoaderIcon className="h-4 w-4 animate-spin" /> : <XIcon className="h-4 w-4" />}
                반려
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
