'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { PlusIcon, LoaderIcon, XIcon, UsersIcon, CalendarIcon } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { useForm } from 'react-hook-form';
import { useProjects, useCreateProject } from '@/hooks/use-projects';
import { useUsers } from '@/hooks/use-users';
import { LoadingSkeleton } from '@/components/ui/loading-spinner';
import { ErrorMessage } from '@/components/ui/error-message';
import { EmptyState } from '@/components/ui/empty-state';
import { GLASS } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface Project {
  id: string;
  name: string;
  memberCount: number;
  taskCount: number;
  doneCount: number;
  createdAt: string;
  members?: { id: string; name: string; avatarUrl: string | null }[];
}

interface User {
  id: string;
  name: string;
}

interface CreateProjectForm {
  name: string;
  memberIds: string[];
}

function ProgressBar({ done, total }: { readonly done: number; readonly total: number }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
        <span>진행률</span>
        <span>{pct}%</span>
      </div>
      <div
        className="h-1.5 w-full rounded-full bg-muted overflow-hidden"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`프로젝트 진행률 ${pct}%`}
      >
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground mt-1">{done} / {total} 태스크 완료</p>
    </div>
  );
}

export default function ProjectsPage() {
  const [createOpen, setCreateOpen] = useState(false);

  const { data: projects, isLoading, error, refetch } = useProjects();
  const projectList = (projects as Project[] | undefined) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">프로젝트</h1>
          <p className="text-sm text-muted-foreground mt-0.5">팀 프로젝트와 태스크를 관리합니다.</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <PlusIcon className="h-4 w-4" aria-hidden="true" />
          프로젝트 만들기
        </button>
      </div>

      {isLoading ? (
        <div className={cn(GLASS.card, 'p-6')}>
          <LoadingSkeleton rows={4} />
        </div>
      ) : error ? (
        <ErrorMessage message="프로젝트 목록을 불러오지 못했습니다." onRetry={() => refetch()} />
      ) : !projectList.length ? (
        <EmptyState
          title="프로젝트 없음"
          message="새 프로젝트를 만들어 팀과 함께 일정을 관리해보세요."
          action={
            <button
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <PlusIcon className="h-4 w-4" />
              프로젝트 만들기
            </button>
          }
        />
      ) : (
        <ul
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
          aria-label="프로젝트 목록"
        >
          {projectList.map((project) => (
            <li key={project.id}>
              <Link
                href={`/projects/${project.id}`}
                className={cn(
                  GLASS.card,
                  'block p-5 hover:ring-2 hover:ring-primary/40 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                )}
                aria-label={`${project.name} 프로젝트 상세 보기`}
              >
                <div className="flex items-start justify-between mb-4">
                  <h2 className="text-sm font-semibold text-foreground line-clamp-2 flex-1 pr-2">
                    {project.name}
                  </h2>
                </div>

                <ProgressBar done={project.doneCount ?? 0} total={project.taskCount ?? 0} />

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <UsersIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    {project.memberCount ?? 0}명
                  </span>
                  <span className="flex items-center gap-1">
                    <CalendarIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    {format(new Date(project.createdAt), 'M월 d일', { locale: ko })}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <CreateProjectModal open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

function CreateProjectModal({
  open,
  onOpenChange,
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}) {
  const { mutateAsync: createProject } = useCreateProject();
  const { data: users } = useUsers();
  const userList = (users as User[] | undefined) ?? [];
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<CreateProjectForm>({
    defaultValues: { name: '', memberIds: [] },
  });

  const handleOpenChange = (open: boolean) => {
    if (!open) { reset(); setSubmitError(null); }
    onOpenChange(open);
  };

  const onSubmit = async (data: CreateProjectForm) => {
    setSubmitError(null);
    try {
      await createProject(data);
      reset();
      onOpenChange(false);
    } catch {
      setSubmitError('프로젝트 생성에 실패했습니다.');
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-[200]" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-[200] -translate-x-1/2 -translate-y-1/2 w-full max-w-md app-glass-card p-6 shadow-lg"
          aria-describedby="create-project-desc"
        >
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-base font-semibold">새 프로젝트</Dialog.Title>
            <Dialog.Close
              className="rounded-md p-1.5 hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="닫기"
            >
              <XIcon className="h-4 w-4" />
            </Dialog.Close>
          </div>
          <Dialog.Description id="create-project-desc" className="sr-only">
            새 프로젝트를 만드는 폼입니다.
          </Dialog.Description>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {submitError && (
              <div role="alert" className="text-sm text-destructive bg-destructive/10 rounded-md p-3">
                {submitError}
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="proj-name" className="text-sm font-medium">프로젝트 이름 *</label>
              <input
                id="proj-name"
                type="text"
                className="w-full rounded-md border border-input px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="예: 2026 신제품 런칭"
                {...register('name', { required: true })}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="proj-members" className="text-sm font-medium">팀원 선택</label>
              <select
                id="proj-members"
                multiple
                className="w-full rounded-md border border-input px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring h-32"
                aria-label="팀원 다중 선택 (Ctrl/Cmd 클릭)"
                {...register('memberIds')}
              >
                {userList.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">Ctrl/Cmd 클릭으로 다중 선택</p>
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
                {isSubmitting ? '생성 중...' : '만들기'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
