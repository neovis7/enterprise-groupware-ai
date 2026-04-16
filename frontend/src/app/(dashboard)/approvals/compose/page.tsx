'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { PlusIcon, XIcon, LoaderIcon, Paperclip } from 'lucide-react';
import { useCreateApproval } from '@/hooks/use-approvals';
import { useUsers } from '@/hooks/use-users';
import type { CreateApproval } from '@/types/api-contracts';
import { GLASS } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import type { User } from '@/types/api-contracts';

const APPROVAL_TYPES = [
  { value: 'general', label: '일반' },
  { value: 'expense', label: '경비' },
  { value: 'vacation', label: '휴가' },
  { value: 'business_trip', label: '출장' },
  { value: 'purchase', label: '구매' },
] as const;

export default function ApprovalComposePage() {
  const router = useRouter();
  const { mutateAsync: createApproval } = useCreateApproval();
  const { data: users = [] } = useUsers();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CreateApproval>({
    defaultValues: {
      type: 'general',
      approverIds: [],
      attachments: [],
    },
  });

  const { fields: approverFields, append: appendApprover, remove: removeApprover } = useFieldArray({
    control,
    name: 'approverIds' as never,
  });

  const onSubmit = async (data: CreateApproval) => {
    setSubmitError(null);
    try {
      const result = await createApproval(data);
      router.push(`/approvals/${result?.id ?? ''}`);
    } catch {
      setSubmitError('결재 기안에 실패했습니다. 잠시 후 다시 시도해주세요.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">결재 기안</h1>
        <p className="text-sm text-muted-foreground mt-0.5">새로운 결재 문서를 작성합니다.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className={cn(GLASS.card, 'p-6 space-y-5')}>
          {submitError && (
            <div role="alert" aria-live="polite" className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
              {submitError}
            </div>
          )}

          {/* 제목 */}
          <div className="space-y-1.5">
            <label htmlFor="title" className="text-sm font-medium text-foreground">
              제목 <span className="text-destructive" aria-hidden="true">*</span>
            </label>
            <input
              id="title"
              type="text"
              placeholder="결재 제목을 입력하세요"
              aria-required="true"
              aria-describedby={errors.title ? 'title-error' : undefined}
              aria-invalid={errors.title ? 'true' : 'false'}
              className={cn(
                'w-full rounded-md border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring',
                errors.title ? 'border-destructive' : 'border-input',
              )}
              {...register('title')}
            />
            {errors.title && (
              <p id="title-error" role="alert" className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          {/* 유형 */}
          <div className="space-y-1.5">
            <label htmlFor="type" className="text-sm font-medium text-foreground">
              결재 유형 <span className="text-destructive" aria-hidden="true">*</span>
            </label>
            <select
              id="type"
              aria-required="true"
              className="w-full rounded-md border border-input px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              {...register('type')}
            >
              {APPROVAL_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* 결재선 */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              결재선 <span className="text-destructive" aria-hidden="true">*</span>
            </p>
            <div className="space-y-2" aria-label="결재자 목록">
              {approverFields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-5">{index + 1}</span>
                  <select
                    aria-label={`결재자 ${index + 1}`}
                    className="flex-1 rounded-md border border-input px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    {...register(`approverIds.${index}` as const)}
                  >
                    <option value="">결재자 선택</option>
                    {(users as User[]).map((u) => (
                      <option key={u.id} value={u.id}>{u.name} ({u.position ?? u.role})</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeApprover(index)}
                    className="rounded-md p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`결재자 ${index + 1} 삭제`}
                  >
                    <XIcon className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => appendApprover('' as never)}
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
            >
              <PlusIcon className="h-4 w-4" aria-hidden="true" />
              결재자 추가
            </button>
            {errors.approverIds && (
              <p role="alert" className="text-xs text-destructive">결재자를 1명 이상 선택해주세요.</p>
            )}
          </div>

          {/* 내용 */}
          <div className="space-y-1.5">
            <label htmlFor="content" className="text-sm font-medium text-foreground">
              내용 <span className="text-destructive" aria-hidden="true">*</span>
            </label>
            <textarea
              id="content"
              rows={8}
              placeholder="결재 내용을 입력하세요"
              aria-required="true"
              aria-describedby={errors.content ? 'content-error' : undefined}
              aria-invalid={errors.content ? 'true' : 'false'}
              className={cn(
                'w-full rounded-md border px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring',
                errors.content ? 'border-destructive' : 'border-input',
              )}
              {...register('content')}
            />
            {errors.content && (
              <p id="content-error" role="alert" className="text-xs text-destructive">{errors.content.message}</p>
            )}
          </div>

          {/* 첨부파일 안내 */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Paperclip className="h-4 w-4" aria-hidden="true" />
            <span>파일 첨부는 파일 드라이브에서 업로드 후 URL을 사용하세요.</span>
          </div>

          {/* 제출 버튼 */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-md border border-input px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              disabled={isSubmitting}
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {isSubmitting && <LoaderIcon className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {isSubmitting ? '기안 중...' : '결재 기안'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
