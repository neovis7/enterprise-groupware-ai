'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  ChevronLeftIcon,
  PlusIcon,
  LoaderIcon,
  XIcon,
  CircleIcon,
  CircleDotIcon,
  CircleCheckIcon,
} from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { useForm } from 'react-hook-form';
import { useProject, useTasks, useCreateTask, useUpdateTask } from '@/hooks/use-projects';
import { useUsers } from '@/hooks/use-users';
import { PageLoading } from '@/components/ui/loading-spinner';
import { ErrorMessage } from '@/components/ui/error-message';
import { EmptyState } from '@/components/ui/empty-state';
import { GLASS } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';

type TaskStatus = 'todo' | 'in_progress' | 'done';
type TaskPriority = 'low' | 'medium' | 'high';

interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  assigneeName?: string | null;
  dueDate: string | null;
}

interface User {
  id: string;
  name: string;
}

interface CreateTaskForm {
  title: string;
  assigneeId: string;
  dueDate: string;
  priority: TaskPriority;
}

const COLUMNS: { id: TaskStatus; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'todo', label: '할 일', icon: CircleIcon },
  { id: 'in_progress', label: '진행 중', icon: CircleDotIcon },
  { id: 'done', label: '완료', icon: CircleCheckIcon },
];

const COLUMN_STYLES: Record<TaskStatus, string> = {
  todo: 'border-t-slate-400',
  in_progress: 'border-t-amber-400',
  done: 'border-t-emerald-500',
};

const PRIORITY_BADGE: Record<TaskPriority, string> = {
  low: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: '낮음',
  medium: '보통',
  high: '높음',
};

function TaskCard({
  task,
  onStatusChange,
  isUpdating,
}: {
  readonly task: Task;
  readonly onStatusChange: (id: string, status: TaskStatus) => void;
  readonly isUpdating: boolean;
}) {
  const nextStatus: Record<TaskStatus, TaskStatus> = {
    todo: 'in_progress',
    in_progress: 'done',
    done: 'todo',
  };
  const nextLabel: Record<TaskStatus, string> = {
    todo: '진행 시작',
    in_progress: '완료 처리',
    done: '다시 열기',
  };

  return (
    <article
      className={cn(
        GLASS.card,
        'p-3 space-y-2',
      )}
      aria-label={`태스크: ${task.title}`}
    >
      <p className="text-sm font-medium text-foreground leading-snug">{task.title}</p>

      <div className="flex items-center gap-2 flex-wrap">
        <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium', PRIORITY_BADGE[task.priority ?? 'medium'])}>
          {PRIORITY_LABEL[task.priority ?? 'medium']}
        </span>
        {task.assigneeName && (
          <span className="text-xs text-muted-foreground truncate">{task.assigneeName}</span>
        )}
        {task.dueDate && (
          <span className="text-xs text-muted-foreground ml-auto">
            {format(new Date(task.dueDate), 'M/d', { locale: ko })}
          </span>
        )}
      </div>

      <button
        onClick={() => onStatusChange(task.id, nextStatus[task.status])}
        disabled={isUpdating}
        className="w-full text-xs rounded-md border border-input px-2 py-1.5 hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`${task.title} — ${nextLabel[task.status]}`}
      >
        {isUpdating ? (
          <span className="flex items-center justify-center gap-1">
            <LoaderIcon className="h-3 w-3 animate-spin" aria-hidden="true" />처리 중...
          </span>
        ) : (
          nextLabel[task.status]
        )}
      </button>
    </article>
  );
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const { data: project, isLoading: projectLoading, error: projectError, refetch: refetchProject } = useProject(id);
  const { data: tasks, isLoading: tasksLoading, error: tasksError, refetch: refetchTasks } = useTasks(id);
  const { mutateAsync: updateTask } = useUpdateTask();

  const taskList = (tasks as Task[] | undefined) ?? [];

  const handleStatusChange = async (taskId: string, status: TaskStatus) => {
    setUpdatingId(taskId);
    try {
      await updateTask({ id: taskId, status });
    } finally {
      setUpdatingId(null);
    }
  };

  if (projectLoading) return <PageLoading />;
  if (projectError) return <ErrorMessage message="프로젝트를 불러오지 못했습니다." onRetry={() => refetchProject()} />;
  if (!project) return <ErrorMessage message="프로젝트를 찾을 수 없습니다." />;

  const p = project as { id: string; name: string };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          aria-label="프로젝트 목록으로"
        >
          <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
          목록
        </button>
        <h1 className="text-lg font-semibold text-foreground">{p.name}</h1>
        <button
          onClick={() => setCreateOpen(true)}
          className="ml-auto inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <PlusIcon className="h-4 w-4" aria-hidden="true" />
          태스크 추가
        </button>
      </div>

      {tasksError ? (
        <ErrorMessage message="태스크 목록을 불러오지 못했습니다." onRetry={() => refetchTasks()} />
      ) : tasksLoading ? (
        <div className={cn(GLASS.card, 'p-6')}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {COLUMNS.map((col) => (
              <div key={col.id} className="space-y-3">
                <div className="h-5 bg-muted rounded animate-pulse w-20" />
                {[1, 2].map((i) => (
                  <div key={i} className="h-24 bg-muted/50 rounded-xl animate-pulse" />
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-5"
          role="region"
          aria-label="칸반 보드"
        >
          {COLUMNS.map((col) => {
            const ColIcon = col.icon;
            const columnTasks = taskList.filter((t) => t.status === col.id);
            return (
              <section
                key={col.id}
                className={cn(GLASS.card, 'p-4 border-t-2', COLUMN_STYLES[col.id])}
                aria-labelledby={`col-${col.id}-heading`}
              >
                <header className="flex items-center gap-2 mb-4">
                  <ColIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <h2 id={`col-${col.id}-heading`} className="text-sm font-semibold text-foreground">
                    {col.label}
                  </h2>
                  <span
                    className="ml-auto text-xs font-medium text-muted-foreground bg-muted rounded-full px-2 py-0.5"
                    aria-label={`${col.label} 태스크 수`}
                  >
                    {columnTasks.length}
                  </span>
                </header>

                {!columnTasks.length ? (
                  <EmptyState message={`${col.label} 태스크가 없습니다.`} />
                ) : (
                  <ul className="space-y-3" aria-label={`${col.label} 태스크 목록`}>
                    {columnTasks.map((task) => (
                      <li key={task.id}>
                        <TaskCard
                          task={task}
                          onStatusChange={handleStatusChange}
                          isUpdating={updatingId === task.id}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}

      <CreateTaskModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        projectId={id}
      />
    </div>
  );
}

function CreateTaskModal({
  open,
  onOpenChange,
  projectId,
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly projectId: string;
}) {
  const { mutateAsync: createTask } = useCreateTask();
  const { data: users } = useUsers();
  const userList = (users as User[] | undefined) ?? [];
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<CreateTaskForm>({
    defaultValues: { priority: 'medium' },
  });

  const handleOpenChange = (open: boolean) => {
    if (!open) { reset(); setSubmitError(null); }
    onOpenChange(open);
  };

  const onSubmit = async (data: CreateTaskForm) => {
    setSubmitError(null);
    try {
      await createTask({ ...data, projectId });
      reset();
      onOpenChange(false);
    } catch {
      setSubmitError('태스크 생성에 실패했습니다.');
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-[200]" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-[200] -translate-x-1/2 -translate-y-1/2 w-full max-w-md app-glass-card p-6 shadow-lg"
          aria-describedby="create-task-desc"
        >
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-base font-semibold">태스크 추가</Dialog.Title>
            <Dialog.Close
              className="rounded-md p-1.5 hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="닫기"
            >
              <XIcon className="h-4 w-4" />
            </Dialog.Close>
          </div>
          <Dialog.Description id="create-task-desc" className="sr-only">
            새 태스크를 추가하는 폼입니다.
          </Dialog.Description>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {submitError && (
              <div role="alert" className="text-sm text-destructive bg-destructive/10 rounded-md p-3">
                {submitError}
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="task-title" className="text-sm font-medium">제목 *</label>
              <input
                id="task-title"
                type="text"
                className="w-full rounded-md border border-input px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="태스크 내용을 입력하세요"
                {...register('title', { required: true })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="task-priority" className="text-sm font-medium">우선순위</label>
                <select
                  id="task-priority"
                  className="w-full rounded-md border border-input px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  {...register('priority')}
                >
                  <option value="low">낮음</option>
                  <option value="medium">보통</option>
                  <option value="high">높음</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="task-due" className="text-sm font-medium">마감일</label>
                <input
                  id="task-due"
                  type="date"
                  className="w-full rounded-md border border-input px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  {...register('dueDate', { required: true })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="task-assignee" className="text-sm font-medium">담당자</label>
              <select
                id="task-assignee"
                className="w-full rounded-md border border-input px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                {...register('assigneeId', { required: true })}
              >
                <option value="">담당자 선택</option>
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
                {isSubmitting ? '추가 중...' : '추가하기'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
