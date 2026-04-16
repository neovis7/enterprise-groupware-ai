'use client';

import { useState, useEffect } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, LoaderIcon, XIcon, UsersIcon } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { useForm } from 'react-hook-form';
import { useDepartments, useCreateDepartment, useUpdateDepartment, useDeleteDepartment } from '@/hooks/use-departments';
import { useUsers } from '@/hooks/use-users';
import { LoadingSkeleton } from '@/components/ui/loading-spinner';
import { ErrorMessage } from '@/components/ui/error-message';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import type { CreateDepartment, Department } from '@/types/api-contracts';
import { GLASS } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';

interface User {
  id: string;
  name: string;
}

export default function AdminDepartmentsPage() {
  const { data: departments, isLoading, error, refetch } = useDepartments();
  const { mutateAsync: deleteDepartment, isPending: isDeleting } = useDeleteDepartment();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const deptList = (departments as Department[] | undefined) ?? [];

  const openCreate = () => {
    setEditingDept(null);
    setEditorOpen(true);
  };

  const openEdit = (dept: Department) => {
    setEditingDept(dept);
    setEditorOpen(true);
  };

  // 최상위 부서 + 자식 부서 트리 구조 렌더링
  const roots = deptList.filter((d) => !d.parentId);
  const children = (parentId: string) => deptList.filter((d) => d.parentId === parentId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">부서 관리</h1>
          <p className="text-sm text-muted-foreground mt-0.5">조직 부서 구조를 관리합니다.</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <PlusIcon className="h-4 w-4" aria-hidden="true" />
          부서 추가
        </button>
      </div>

      <div className={cn(GLASS.card, 'overflow-hidden')}>
        {isLoading ? (
          <div className="p-4"><LoadingSkeleton rows={5} /></div>
        ) : error ? (
          <ErrorMessage message="부서 목록을 불러오지 못했습니다." onRetry={() => refetch()} />
        ) : !deptList.length ? (
          <EmptyState
            title="부서 없음"
            message="등록된 부서가 없습니다."
            action={
              <button
                onClick={openCreate}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <PlusIcon className="h-4 w-4" />부서 추가
              </button>
            }
          />
        ) : (
          <table className="w-full text-sm" aria-label="부서 목록">
            <thead className="bg-muted/50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">부서명</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase hidden sm:table-cell">상위 부서</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">인원</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {roots.map((dept) => (
                <>
                  <DeptRow
                    key={dept.id}
                    dept={dept}
                    depth={0}
                    parentName={null}
                    allDepts={deptList}
                    onEdit={openEdit}
                    onDelete={(id) => setDeleteTarget(id)}
                  />
                  {children(dept.id).map((child) => (
                    <DeptRow
                      key={child.id}
                      dept={child}
                      depth={1}
                      parentName={dept.name}
                      allDepts={deptList}
                      onEdit={openEdit}
                      onDelete={(id) => setDeleteTarget(id)}
                    />
                  ))}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <DeptEditorModal
        open={editorOpen}
        onOpenChange={setEditorOpen}
        editingDept={editingDept}
        deptList={deptList}
        onDone={() => setEditorOpen(false)}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="부서 삭제"
        description="이 부서를 삭제하시겠습니까? 하위 부서가 있을 경우 함께 영향을 받을 수 있습니다."
        confirmLabel="삭제"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={async () => {
          if (!deleteTarget) return;
          await deleteDepartment(deleteTarget);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}

function DeptRow({
  dept,
  depth,
  parentName,
  allDepts: _allDepts,
  onEdit,
  onDelete,
}: {
  readonly dept: Department;
  readonly depth: number;
  readonly parentName: string | null;
  readonly allDepts: Department[];
  readonly onEdit: (dept: Department) => void;
  readonly onDelete: (id: string) => void;
}) {
  return (
    <tr className="hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2" style={{ paddingLeft: depth * 20 }}>
          {depth > 0 && (
            <span className="text-muted-foreground/40 select-none" aria-hidden="true">└</span>
          )}
          <span className="font-medium text-foreground">{dept.name}</span>
        </div>
      </td>
      <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">
        {parentName ?? '최상위'}
      </td>
      <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
        <span className="flex items-center gap-1">
          <UsersIcon className="h-3.5 w-3.5" aria-hidden="true" />
          {dept.memberCount}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => onEdit(dept)}
            className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`"${dept.name}" 수정`}
          >
            <PencilIcon className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            onClick={() => onDelete(dept.id)}
            className="rounded-md p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`"${dept.name}" 삭제`}
          >
            <TrashIcon className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </td>
    </tr>
  );
}

function DeptEditorModal({
  open,
  onOpenChange,
  editingDept,
  deptList,
  onDone,
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly editingDept: Department | null;
  readonly deptList: Department[];
  readonly onDone: () => void;
}) {
  const { mutateAsync: createDepartment } = useCreateDepartment();
  const { mutateAsync: updateDepartment } = useUpdateDepartment();
  const { data: users } = useUsers();
  const userList = (users as User[] | undefined) ?? [];
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isEdit = Boolean(editingDept);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CreateDepartment>({
    defaultValues: { parentId: null, managerId: null },
  });

  useEffect(() => {
    if (editingDept) {
      reset({ name: editingDept.name, parentId: editingDept.parentId, managerId: editingDept.managerId });
    } else {
      reset({ name: '', parentId: null, managerId: null });
    }
  }, [editingDept, reset]);

  const handleOpenChange = (open: boolean) => {
    if (!open) { reset(); setSubmitError(null); }
    onOpenChange(open);
  };

  const onSubmit = async (data: CreateDepartment) => {
    setSubmitError(null);
    try {
      if (isEdit && editingDept) {
        await updateDepartment({ id: editingDept.id, ...data });
      } else {
        await createDepartment(data);
      }
      reset();
      onDone();
    } catch {
      setSubmitError(`부서 ${isEdit ? '수정' : '추가'}에 실패했습니다.`);
    }
  };

  // 자기 자신은 상위 부서로 선택 불가
  const parentOptions = deptList.filter((d) => d.id !== editingDept?.id);

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-[200]" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-[200] -translate-x-1/2 -translate-y-1/2 w-full max-w-md app-glass-card p-6 shadow-lg"
          aria-describedby="dept-editor-desc"
        >
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-base font-semibold">
              {isEdit ? '부서 수정' : '부서 추가'}
            </Dialog.Title>
            <Dialog.Close
              className="rounded-md p-1.5 hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="닫기"
            >
              <XIcon className="h-4 w-4" />
            </Dialog.Close>
          </div>
          <Dialog.Description id="dept-editor-desc" className="sr-only">
            부서 정보 입력 폼입니다.
          </Dialog.Description>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {submitError && (
              <div role="alert" className="text-sm text-destructive bg-destructive/10 rounded-md p-3">
                {submitError}
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="d-name" className="text-sm font-medium">부서명 *</label>
              <input
                id="d-name"
                type="text"
                className="w-full rounded-md border border-input px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="예: 개발팀"
                {...register('name')}
              />
              {errors.name && <p role="alert" className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="d-parent" className="text-sm font-medium">상위 부서</label>
              <select
                id="d-parent"
                className="w-full rounded-md border border-input px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                {...register('parentId')}
              >
                <option value="">최상위 부서</option>
                {parentOptions.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="d-manager" className="text-sm font-medium">부서장</label>
              <select
                id="d-manager"
                className="w-full rounded-md border border-input px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                {...register('managerId')}
              >
                <option value="">미지정</option>
                {userList.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
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
