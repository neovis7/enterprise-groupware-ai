'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { PlusIcon, PencilIcon, TrashIcon, LoaderIcon, XIcon } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { useForm } from 'react-hook-form';
import { usePosts, useCreatePost, useUpdatePost, useDeletePost } from '@/hooks/use-posts';
import { LoadingSkeleton } from '@/components/ui/loading-spinner';
import { ErrorMessage } from '@/components/ui/error-message';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import type { CreatePost, Post } from '@/types/api-contracts';
import { GLASS } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';

export default function PostsAdminPage() {
  const { data: posts, isLoading, error, refetch } = usePosts();
  const { mutateAsync: deletePost, isPending: isDeleting } = useDeletePost();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const postList = (posts as Post[] | undefined) ?? [];

  const openCreate = () => {
    setEditingPost(null);
    setEditorOpen(true);
  };

  const openEdit = (post: Post) => {
    setEditingPost(post);
    setEditorOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">공지사항 관리</h1>
          <p className="text-sm text-muted-foreground mt-0.5">공지사항을 작성하고 관리합니다.</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <PlusIcon className="h-4 w-4" aria-hidden="true" />
          공지 작성
        </button>
      </div>

      <div className={cn(GLASS.card, 'overflow-hidden')}>
        {isLoading ? (
          <div className="p-4"><LoadingSkeleton rows={5} /></div>
        ) : error ? (
          <ErrorMessage message="공지 목록을 불러오지 못했습니다." onRetry={() => refetch()} />
        ) : !postList.length ? (
          <EmptyState title="공지사항 없음" message="작성된 공지사항이 없습니다." action={
            <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
              <PlusIcon className="h-4 w-4" />공지 작성
            </button>
          } />
        ) : (
          <table className="w-full text-sm" aria-label="공지사항 목록">
            <thead className="bg-muted/50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">제목</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">유형</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase hidden sm:table-cell">등록일</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {postList.map((post) => (
                <tr key={post.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {post.isPinned && <span className="text-xs text-primary font-medium">[고정]</span>}
                      <span className="font-medium text-foreground truncate max-w-[200px]">{post.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                    {post.type === 'notice' ? '공지' : '일반'}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">
                    {format(new Date(post.createdAt), 'yyyy.MM.dd', { locale: ko })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(post)}
                        className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={`"${post.title}" 수정`}
                      >
                        <PencilIcon className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(post.id)}
                        className="rounded-md p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={`"${post.title}" 삭제`}
                      >
                        <TrashIcon className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 에디터 모달 */}
      <PostEditorModal
        open={editorOpen}
        onOpenChange={setEditorOpen}
        editingPost={editingPost}
        onDone={() => setEditorOpen(false)}
      />

      {/* 삭제 확인 */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="공지사항 삭제"
        description="이 공지사항을 삭제하시겠습니까? 삭제된 공지는 복구할 수 없습니다."
        confirmLabel="삭제"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={async () => {
          if (!deleteTarget) return;
          await deletePost(deleteTarget);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}

function PostEditorModal({
  open,
  onOpenChange,
  editingPost,
  onDone,
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly editingPost: Post | null;
  readonly onDone: () => void;
}) {
  const { mutateAsync: createPost } = useCreatePost();
  const { mutateAsync: updatePost } = useUpdatePost();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isEdit = Boolean(editingPost);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CreatePost>({
    defaultValues: { type: 'notice', isPinned: false },
  });

  // 수정 모드 진입 시 폼 값 동기화
  useEffect(() => {
    if (editingPost) {
      reset({ title: editingPost.title, content: editingPost.content, type: editingPost.type, isPinned: editingPost.isPinned, targetDepartments: editingPost.targetDepartments });
    } else {
      reset({ type: 'notice', isPinned: false });
    }
  }, [editingPost, reset]);

  const handleOpenChange = (open: boolean) => {
    if (!open) { reset(); setSubmitError(null); }
    onOpenChange(open);
  };

  const onSubmit = async (data: CreatePost) => {
    setSubmitError(null);
    try {
      if (isEdit && editingPost) {
        await updatePost({ id: editingPost.id, ...data });
      } else {
        await createPost(data);
      }
      reset();
      onDone();
    } catch {
      setSubmitError(`공지사항 ${isEdit ? '수정' : '작성'}에 실패했습니다.`);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-[200]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[200] -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl app-glass-card p-6 shadow-lg max-h-[90vh] overflow-y-auto" aria-describedby="post-editor-desc">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-base font-semibold">{isEdit ? '공지사항 수정' : '공지사항 작성'}</Dialog.Title>
            <Dialog.Close className="rounded-md p-1.5 hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="닫기">
              <XIcon className="h-4 w-4" />
            </Dialog.Close>
          </div>
          <Dialog.Description id="post-editor-desc" className="sr-only">공지사항 작성 폼입니다.</Dialog.Description>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {submitError && <div role="alert" className="text-sm text-destructive bg-destructive/10 rounded-md p-3">{submitError}</div>}

            <div className="space-y-1.5">
              <label htmlFor="p-title" className="text-sm font-medium">제목 *</label>
              <input id="p-title" type="text" className="w-full rounded-md border border-input px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" {...register('title')} />
              {errors.title && <p role="alert" className="text-xs text-destructive">{errors.title.message}</p>}
            </div>

            <div className="flex gap-4">
              <div className="space-y-1.5 flex-1">
                <label htmlFor="p-type" className="text-sm font-medium">유형</label>
                <select id="p-type" className="w-full rounded-md border border-input px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" {...register('type')}>
                  <option value="notice">공지</option>
                  <option value="general">일반</option>
                </select>
              </div>
              <div className="flex items-end gap-2 pb-2">
                <input id="p-pinned" type="checkbox" className="h-4 w-4 rounded border-input focus:ring-2 focus:ring-ring" {...register('isPinned')} />
                <label htmlFor="p-pinned" className="text-sm font-medium">상단 고정</label>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="p-content" className="text-sm font-medium">내용 *</label>
              <textarea id="p-content" rows={10} className="w-full rounded-md border border-input px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring" {...register('content')} />
              {errors.content && <p role="alert" className="text-xs text-destructive">{errors.content.message}</p>}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Dialog.Close className="rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">취소</Dialog.Close>
              <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {isSubmitting && <LoaderIcon className="h-4 w-4 animate-spin" />}
                {isSubmitting ? '저장 중...' : isEdit ? '수정 완료' : '게시하기'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
