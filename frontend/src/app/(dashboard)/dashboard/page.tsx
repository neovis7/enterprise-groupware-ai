'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  FileCheckIcon,
  CalendarIcon,
  MegaphoneIcon,
  SparklesIcon,
  ArrowRightIcon,
  LoaderIcon,
} from 'lucide-react';
import { useApprovals } from '@/hooks/use-approvals';
import { useSchedules } from '@/hooks/use-schedules';
import { usePosts } from '@/hooks/use-posts';
import { useCreateAISession, useAIStream } from '@/hooks/use-ai';
import { ApprovalStatusBadge } from '@/components/ui/approval-status-badge';
import { LoadingSkeleton } from '@/components/ui/loading-spinner';
import { ErrorMessage } from '@/components/ui/error-message';
import { EmptyState } from '@/components/ui/empty-state';
import { GLASS } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import type { Approval, Schedule, Post } from '@/types/api-contracts';

export default function DashboardPage() {
  const now = new Date();
  const { data: myApprovals, isLoading: approvalsLoading, error: approvalsError, refetch: refetchApprovals } = useApprovals({ status: 'mine' });
  const { data: pendingApprovals } = useApprovals({ status: 'pending', assignee: 'me' });
  const { data: schedules, isLoading: schedulesLoading } = useSchedules(now.getFullYear(), now.getMonth() + 1);
  const { data: posts, isLoading: postsLoading } = usePosts({ type: 'notice', page: 1 });
  const { mutateAsync: createSession } = useCreateAISession();
  const { sendMessage, content: aiContent, isStreaming, reset: resetAI } = useAIStream();

  const [aiInput, setAiInput] = useState('');
  const [aiSessionId, setAiSessionId] = useState<string | null>(null);

  const handleAiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInput.trim() || isStreaming) return;

    resetAI();
    let sessionId = aiSessionId;
    if (!sessionId) {
      const session = await createSession();
      sessionId = session?.id ?? null;
      setAiSessionId(sessionId);
    }
    if (!sessionId) return;
    const query = aiInput;
    setAiInput('');
    await sendMessage(sessionId, query);
  };

  const pendingCount = (pendingApprovals as Approval[] | undefined)?.length ?? 0;

  return (
    <div className="space-y-6">
      {/* 요약 카드 행 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          icon={<FileCheckIcon className="h-5 w-5 text-amber-500" />}
          label="결재 대기"
          value={pendingCount}
          href="/approvals/inbox"
          color="amber"
        />
        <SummaryCard
          icon={<CalendarIcon className="h-5 w-5 text-blue-500" />}
          label="오늘 일정"
          value={(schedules as Schedule[] | undefined)?.filter((s) => {
            const d = new Date(s.startAt);
            return d.toDateString() === now.toDateString();
          }).length ?? 0}
          href="/schedule"
          color="blue"
        />
        <SummaryCard
          icon={<MegaphoneIcon className="h-5 w-5 text-emerald-500" />}
          label="읽지 않은 공지"
          value={(posts as Post[] | undefined)?.filter((p) => !p.isRead).length ?? 0}
          href="/posts"
          color="emerald"
        />
      </div>

      {/* 하단 그리드 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 최근 결재 */}
        <section className={cn(GLASS.card, 'p-5')} aria-labelledby="approvals-heading">
          <div className="flex items-center justify-between mb-4">
            <h2 id="approvals-heading" className="text-sm font-semibold text-foreground">내 결재 현황</h2>
            <Link href="/approvals" className="text-xs text-primary hover:underline flex items-center gap-1">
              전체보기 <ArrowRightIcon className="h-3 w-3" />
            </Link>
          </div>
          {approvalsLoading ? (
            <LoadingSkeleton rows={3} />
          ) : approvalsError ? (
            <ErrorMessage message="결재 목록을 불러오지 못했습니다." onRetry={() => refetchApprovals()} />
          ) : !(myApprovals as Approval[] | undefined)?.length ? (
            <EmptyState message="결재 대기 건이 없습니다." />
          ) : (
            <ul className="space-y-2" aria-label="최근 결재 목록">
              {(myApprovals as Approval[]).slice(0, 5).map((appr) => (
                <li key={appr.id}>
                  <Link
                    href={`/approvals/${appr.id}`}
                    className="flex items-center justify-between rounded-lg p-2.5 hover:bg-accent transition-colors group"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate group-hover:text-primary">{appr.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(appr.createdAt), 'M월 d일', { locale: ko })}
                      </p>
                    </div>
                    <ApprovalStatusBadge status={appr.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 오늘 일정 */}
        <section className={cn(GLASS.card, 'p-5')} aria-labelledby="schedule-heading">
          <div className="flex items-center justify-between mb-4">
            <h2 id="schedule-heading" className="text-sm font-semibold text-foreground">오늘 일정</h2>
            <Link href="/schedule" className="text-xs text-primary hover:underline flex items-center gap-1">
              전체보기 <ArrowRightIcon className="h-3 w-3" />
            </Link>
          </div>
          {schedulesLoading ? (
            <LoadingSkeleton rows={3} />
          ) : (
            (() => {
              const todaySchedules = (schedules as Schedule[] | undefined)?.filter(
                (s) => new Date(s.startAt).toDateString() === now.toDateString(),
              ) ?? [];
              if (!todaySchedules.length) {
                return <EmptyState message="오늘 예정된 일정이 없습니다." />;
              }
              return (
                <ul className="space-y-2" aria-label="오늘 일정 목록">
                  {todaySchedules.slice(0, 5).map((s) => (
                    <li key={s.id} className="flex items-center gap-3 rounded-lg p-2.5 hover:bg-accent transition-colors">
                      <div className="h-8 w-1 rounded-full bg-primary flex-shrink-0" aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{s.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(new Date(s.startAt), 'HH:mm')} – {format(new Date(s.endAt), 'HH:mm')}
                          {s.location && ` · ${s.location}`}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              );
            })()
          )}
        </section>

        {/* 최근 공지 */}
        <section className={cn(GLASS.card, 'p-5')} aria-labelledby="posts-heading">
          <div className="flex items-center justify-between mb-4">
            <h2 id="posts-heading" className="text-sm font-semibold text-foreground">최근 공지사항</h2>
            <Link href="/posts" className="text-xs text-primary hover:underline flex items-center gap-1">
              전체보기 <ArrowRightIcon className="h-3 w-3" />
            </Link>
          </div>
          {postsLoading ? (
            <LoadingSkeleton rows={3} />
          ) : !(posts as Post[] | undefined)?.length ? (
            <EmptyState message="공지사항이 없습니다." />
          ) : (
            <ul className="space-y-2" aria-label="최근 공지 목록">
              {(posts as Post[]).slice(0, 5).map((post) => (
                <li key={post.id}>
                  <Link
                    href={`/posts/${post.id}`}
                    className="flex items-center justify-between rounded-lg p-2.5 hover:bg-accent transition-colors group"
                  >
                    <div className="min-w-0 flex-1">
                      <p className={cn('text-sm font-medium truncate group-hover:text-primary', !post.isRead && 'font-semibold')}>
                        {post.isPinned && <span className="text-primary mr-1" aria-label="고정">[공지]</span>}
                        {post.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(post.createdAt), 'M월 d일', { locale: ko })}
                      </p>
                    </div>
                    {!post.isRead && (
                      <span className="ml-2 h-2 w-2 rounded-full bg-primary flex-shrink-0" aria-label="읽지 않음" />
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* AI 빠른 질문 */}
        <section className={cn(GLASS.card, 'p-5')} aria-labelledby="ai-quick-heading">
          <div className="flex items-center gap-2 mb-4">
            <SparklesIcon className="h-4 w-4 text-primary" aria-hidden="true" />
            <h2 id="ai-quick-heading" className="text-sm font-semibold text-foreground">AI 어시스턴트 빠른 질문</h2>
          </div>

          {aiContent && (
            <div className="mb-3 rounded-lg bg-muted/50 p-3 text-sm text-foreground max-h-32 overflow-y-auto">
              {aiContent}
              {isStreaming && (
                <span className="inline-flex gap-1 ml-1" aria-label="AI 응답 중">
                  <span className="app-ai-typing-dot" />
                  <span className="app-ai-typing-dot" />
                  <span className="app-ai-typing-dot" />
                </span>
              )}
            </div>
          )}

          <form onSubmit={handleAiSubmit} className="flex gap-2">
            <input
              type="text"
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              placeholder="AI에게 무엇이든 물어보세요..."
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="AI 질문 입력"
              disabled={isStreaming}
            />
            <button
              type="submit"
              disabled={!aiInput.trim() || isStreaming}
              className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="질문 전송"
            >
              {isStreaming ? (
                <LoaderIcon className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">
            <Link href="/ai" className="text-primary hover:underline">AI 어시스턴트 전체 화면</Link>에서 더 자세한 대화를 나눠보세요.
          </p>
        </section>
      </div>
    </div>
  );
}

interface SummaryCardProps {
  readonly icon: React.ReactNode;
  readonly label: string;
  readonly value: number;
  readonly href: string;
  readonly color: 'amber' | 'blue' | 'emerald';
}

function SummaryCard({ icon, label, value, href, color }: SummaryCardProps) {
  const bgMap = {
    amber: 'bg-amber-500/10',
    blue: 'bg-blue-500/10',
    emerald: 'bg-emerald-500/10',
  };

  return (
    <Link
      href={href}
      className={cn(GLASS.card, 'p-5 flex items-center gap-4 hover:shadow-md transition-shadow group')}
      aria-label={`${label}: ${value}건`}
    >
      <div className={cn('rounded-xl p-3', bgMap[color])}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </div>
    </Link>
  );
}
