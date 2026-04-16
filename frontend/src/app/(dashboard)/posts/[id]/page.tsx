'use client';

/**
 * 공지사항 상세 페이지
 * 보안: HTML 콘텐츠는 textContent로 렌더링 (XSS 방지).
 * 서버가 신뢰할 수 있는 HTML을 반환하는 경우 DOMPurify 추가 시
 * sanitizeHtml() 함수를 적용하세요.
 */
import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { ChevronLeftIcon, PaperclipIcon, EyeIcon } from 'lucide-react';
import { usePost, useReadPost } from '@/hooks/use-posts';
import { PageLoading } from '@/components/ui/loading-spinner';
import { ErrorMessage } from '@/components/ui/error-message';
import { GLASS } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import type { Post } from '@/types/api-contracts';

/** HTML 태그를 제거하고 텍스트만 추출 (XSS 방지) */
function stripHtml(html: string): string {
  // 서버사이드: DOMParser 미사용, 정규식으로 태그 제거
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').trim();
}

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: post, isLoading, error, refetch } = usePost(id);
  const { mutate: markRead } = useReadPost();

  const p = post as Post | null;

  // 자동 읽음 처리
  useEffect(() => {
    if (p && !p.isRead) {
      markRead(p.id);
    }
  }, [p, markRead]);

  if (isLoading) return <PageLoading />;
  if (error) return <ErrorMessage message="공지사항을 불러오지 못했습니다." onRetry={() => refetch()} />;
  if (!p) return <ErrorMessage message="공지사항을 찾을 수 없습니다." />;

  // 콘텐츠에서 HTML 태그 제거 (XSS 방지)
  const safeContent = stripHtml(p.content);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
      >
        <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
        목록으로
      </button>

      <article className={cn(GLASS.card, 'p-6')}>
        {/* 헤더 */}
        <header className="border-b border-border pb-4 mb-4 space-y-2">
          {p.isPinned && (
            <span className="inline-block text-xs font-medium text-primary bg-primary/10 rounded-full px-2.5 py-0.5">
              공지
            </span>
          )}
          <h1 className="text-xl font-bold text-foreground">{p.title}</h1>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <time dateTime={p.createdAt}>
              {format(new Date(p.createdAt), 'yyyy년 M월 d일 HH:mm', { locale: ko })}
            </time>
            <span className="flex items-center gap-1" aria-label={`조회수 ${p.viewCount}`}>
              <EyeIcon className="h-3.5 w-3.5" aria-hidden="true" />
              {p.viewCount}
            </span>
          </div>
        </header>

        {/* 본문 — 텍스트 안전 렌더링 (XSS 방지) */}
        <div
          className="text-sm text-foreground leading-relaxed whitespace-pre-wrap"
          aria-label="공지 내용"
        >
          {safeContent}
        </div>

        {/* 첨부파일 */}
        {p.attachments.length > 0 && (
          <div className="mt-6 pt-4 border-t border-border">
            <p className="text-sm font-medium text-foreground mb-2">첨부파일</p>
            <ul className="space-y-1">
              {p.attachments.map((att) => (
                <li key={att.url}>
                  <a
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    <PaperclipIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    {att.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </article>
    </div>
  );
}
