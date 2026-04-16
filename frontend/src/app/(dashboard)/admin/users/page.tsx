'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { PlusIcon, PencilIcon, TrashIcon, LoaderIcon, XIcon } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { useForm } from 'react-hook-form';
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from '@/hooks/use-users';
import { useDepartments } from '@/hooks/use-departments';
import { LoadingSkeleton } from '@/components/ui/loading-spinner';
import { ErrorMessage } from '@/components/ui/error-message';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import type { CreateUser, User } from '@/types/api-contracts';
import { GLASS } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';

interface Department {
  id: string;
  name: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: '관리자',
  manager: '매니저',
  employee: '일반',
};

const ROLE_BADGE: Record<string, string> = {
  admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  manager: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  employee: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

export default function AdminUsersPage() {
  const { data: users, isLoading, error, refetch } = useUsers();
  const { mutateAsync: deleteUser, isPending: isDeleting } = useDeleteUser();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const userList = (users as User[] | undefined) ?? [];

  const openCreate = () => {
    setEditingUser(null);
    setEditorOpen(true);
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setEditorOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">사용자 관리</h1>
          <p className="text-sm text-muted-foreground mt-0.5">시스템 사용자를 추가하고 관리합니다.</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <PlusIcon className="h-4 w-4" aria-hidden="true" />
          사용자 추가
        </button>
      </div>

      <div className={cn(GLASS.card, 'overflow-hidden')}>
        {isLoading ? (
          <div className="p-4"><LoadingSkeleton rows={6} /></div>
        ) : error ? (
          <ErrorMessage message="사용자 목록을 불러오지 못했습니다." onRetry={() => refetch()} />
        ) : !userList.length ? (
          <EmptyState
            title="사용자 없음"
            message="등록된 사용자가 없습니다."
            action={
              <button
                onClick={openCreate}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <PlusIcon className="h-4 w-4" />사용자 추가
              </button>
            }
          />
        ) : (
          <table className="w-full text-sm" aria-label="사용자 목록">
            <thead className="bg-muted/50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">이름</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">이메일</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">역할</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase hidden lg:table-cell">직책</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase hidden xl:table-cell">가입일</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {userList.map((user) => (
                <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt=""
                          aria-hidden="true"
                          className="h-7 w-7 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div
                          className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary flex-shrink-0"
                          aria-hidden="true"
                        >
                          {user.name.slice(0, 1)}
                        </div>
                      )}
                      <span className="font-medium text-foreground">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium', ROLE_BADGE[user.role])}>
                      {ROLE_LABELS[user.role] ?? user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                    {user.position ?? '—'}
                  </td>
                  <td className="px-4 py-3 hidden xl:table-cell text-muted-foreground">
                    {format(new Date(user.createdAt), 'yyyy.MM.dd', { locale: ko })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(user)}
                        className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={`"${user.name}" 수정`}
                      >
                        <PencilIcon className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(user.id)}
                        className="rounded-md p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={`"${user.name}" 삭제`}
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

      <UserEditorModal
        open={editorOpen}
        onOpenChange={setEditorOpen}
        editingUser={editingUser}
        onDone={() => setEditorOpen(false)}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="사용자 삭제"
        description="이 사용자를 삭제하시겠습니까? 삭제된 계정은 복구할 수 없습니다."
        confirmLabel="삭제"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={async () => {
          if (!deleteTarget) return;
          await deleteUser(deleteTarget);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}

function UserEditorModal({
  open,
  onOpenChange,
  editingUser,
  onDone,
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly editingUser: User | null;
  readonly onDone: () => void;
}) {
  const { mutateAsync: createUser } = useCreateUser();
  const { mutateAsync: updateUser } = useUpdateUser();
  const { data: departments } = useDepartments();
  const deptList = (departments as Department[] | undefined) ?? [];
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isEdit = Boolean(editingUser);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CreateUser>({
    defaultValues: { role: 'employee' },
  });

  useEffect(() => {
    if (editingUser) {
      reset({ name: editingUser.name, email: editingUser.email, role: editingUser.role, departmentId: editingUser.departmentId, position: editingUser.position ?? undefined, password: '' });
    } else {
      reset({ role: 'employee', name: '', email: '', password: '', departmentId: '' });
    }
  }, [editingUser, reset]);

  const handleOpenChange = (open: boolean) => {
    if (!open) { reset(); setSubmitError(null); }
    onOpenChange(open);
  };

  const onSubmit = async (data: CreateUser) => {
    setSubmitError(null);
    try {
      if (isEdit && editingUser) {
        const { password, ...rest } = data;
        await updateUser({ id: editingUser.id, ...rest, ...(password ? { password } : {}) });
      } else {
        await createUser(data);
      }
      reset();
      onDone();
    } catch {
      setSubmitError(`사용자 ${isEdit ? '수정' : '추가'}에 실패했습니다.`);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-[200]" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-[200] -translate-x-1/2 -translate-y-1/2 w-full max-w-lg app-glass-card p-6 shadow-lg max-h-[90vh] overflow-y-auto"
          aria-describedby="user-editor-desc"
        >
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-base font-semibold">
              {isEdit ? '사용자 수정' : '사용자 추가'}
            </Dialog.Title>
            <Dialog.Close
              className="rounded-md p-1.5 hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="닫기"
            >
              <XIcon className="h-4 w-4" />
            </Dialog.Close>
          </div>
          <Dialog.Description id="user-editor-desc" className="sr-only">
            사용자 정보 입력 폼입니다.
          </Dialog.Description>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {submitError && (
              <div role="alert" className="text-sm text-destructive bg-destructive/10 rounded-md p-3">
                {submitError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="u-name" className="text-sm font-medium">이름 *</label>
                <input
                  id="u-name"
                  type="text"
                  className="w-full rounded-md border border-input px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  {...register('name')}
                />
                {errors.name && <p role="alert" className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <label htmlFor="u-position" className="text-sm font-medium">직책</label>
                <input
                  id="u-position"
                  type="text"
                  className="w-full rounded-md border border-input px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="예: 선임 개발자"
                  {...register('position')}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="u-email" className="text-sm font-medium">이메일 *</label>
              <input
                id="u-email"
                type="email"
                className="w-full rounded-md border border-input px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                {...register('email')}
              />
              {errors.email && <p role="alert" className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="u-password" className="text-sm font-medium">
                비밀번호 {isEdit && <span className="text-muted-foreground font-normal">(변경 시만 입력)</span>}
                {!isEdit && ' *'}
              </label>
              <input
                id="u-password"
                type="password"
                className="w-full rounded-md border border-input px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                autoComplete={isEdit ? 'new-password' : 'new-password'}
                {...register('password')}
              />
              {errors.password && <p role="alert" className="text-xs text-destructive">{errors.password.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="u-role" className="text-sm font-medium">역할 *</label>
                <select
                  id="u-role"
                  className="w-full rounded-md border border-input px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  {...register('role')}
                >
                  <option value="employee">일반</option>
                  <option value="manager">매니저</option>
                  <option value="admin">관리자</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="u-dept" className="text-sm font-medium">부서 *</label>
                <select
                  id="u-dept"
                  className="w-full rounded-md border border-input px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  {...register('departmentId')}
                >
                  <option value="">부서 선택</option>
                  {deptList.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                {errors.departmentId && <p role="alert" className="text-xs text-destructive">{errors.departmentId.message}</p>}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Dialog.Close className="rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                취소
              </Dialog.Close>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {isSubmitting && <LoaderIcon className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {isSubmitting ? '저장 중...' : isEdit ? '수정 완료' : '추가하기'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
