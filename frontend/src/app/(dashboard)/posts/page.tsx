'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { PinIcon, EyeIcon } from 'lucide-react';
import { usePosts, useReadPost } from '@/hooks/use-posts';
import { LoadingSkeleton } from '@/components/ui/loading-spinner';
import { ErrorMessage } from '@/components/ui/error-message';
import { EmptyState } from '@/components/ui/empty-state';
import { GLASS } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import type { Post } from '@/types/api-contracts';

export default function PostsPage() {
  const { data: posts, isLoading, error, refetch } = usePosts({ type: 'notice', page: 1 });
  const { mutate: markRead } = useReadPost();

  const postList = (posts as Post[] | undefined) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">공지사항</h1>
          <p className="text-sm text-muted-foreground mt-0.5">전사 공지 및 중요 안내를 확인하세요.</p>
        </div>
      </div>

      <div className={cn(GLASS.card, 'overflow-hidden')}>
        {isLoading ? (
          <div className="p-4"><LoadingSkeleton rows={5} /></div>
        ) : error ? (
          <ErrorMessage message="공지사항을 불러오지 못했습니다." onRetry={() => refetch()} />
        ) : !postList.length ? (
          <EmptyState title="공지사항 없음" message="등록된 공지사항이 없습니다." />
        ) : (
          <ul className="divide-y divide-border" aria-label="공지사항 목록">
            {/* 고정 공지 먼저 */}
            {[...postList].sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0)).map((post) => (
              <li key={post.id}>
                <Link
                  href={`/posts/${post.id}`}
                  onClick={() => { if (!post.isRead) markRead(post.id); }}
                  className="flex items-center gap-3 px-5 py-4 hover:bg-accent transition-colors group"
                >
                  {post.isPinned && (
                    <PinIcon className="h-4 w-4 text-primary flex-shrink-0" aria-label="고정 공지" />
                  )}
                  {!post.isPinned && (
                    <div className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {!post.isRead && (
                        <span className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" aria-label="읽지 않음" />
                      )}
                      <p className={cn(
                        'text-sm truncate group-hover:text-primary transition-colors',
                        !post.isRead ? 'font-semibold text-foreground' : 'font-medium text-foreground/80',
                      )}>
                        {post.title}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(post.createdAt), 'yyyy.MM.dd', { locale: ko })}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                    <EyeIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    <span aria-label={`조회수 ${post.viewCount}`}>{post.viewCount}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
