'use client';

import { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth } from 'date-fns';
import { ko } from 'date-fns/locale';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, LoaderIcon, XIcon, PencilIcon, CheckIcon } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { useForm } from 'react-hook-form';
import {
  useSchedules,
  useCreateSchedule,
  useSchedule,
  useUpdateSchedule,
  useRespondSchedule,
  useDeleteSchedule,
} from '@/hooks/use-schedules';
import { useUsers } from '@/hooks/use-users';
import { useAuth } from '@/hooks/use-auth';
import { LoadingSkeleton } from '@/components/ui/loading-spinner';
import { ErrorMessage } from '@/components/ui/error-message';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { CreateScheduleSchema, type CreateSchedule, type Schedule } from '@/types/api-contracts';
import { GLASS } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import type { User } from '@/types/api-contracts';

export default function SchedulePage() {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today);
  const [selectedDate, setSelectedDate] = useState<Date | null>(today);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth() + 1;

  const { data: schedules, isLoading, error, refetch } = useSchedules(year, month);
  const { mutateAsync: createSchedule } = useCreateSchedule();
  const { mutateAsync: deleteSchedule, isPending: isDeleting } = useDeleteSchedule();

  const scheduleList = (schedules as Schedule[] | undefined) ?? [];

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const getSchedulesForDay = (day: Date) =>
    scheduleList.filter((s) => isSameDay(new Date(s.startAt), day));

  const selectedDaySchedules = selectedDate
    ? getSchedulesForDay(selectedDate)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">일정</h1>
        <button
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <PlusIcon className="h-4 w-4" aria-hidden="true" />
          일정 추가
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 달력 */}
        <section className={cn(GLASS.card, 'p-5 lg:col-span-2')} aria-labelledby="calendar-heading">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1))}
              className="rounded-md p-1.5 hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="이전 달"
            >
              <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
            </button>
            <h2 id="calendar-heading" className="text-sm font-semibold text-foreground">
              {format(currentMonth, 'yyyy년 M월', { locale: ko })}
            </h2>
            <button
              onClick={() => setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1))}
              className="rounded-md p-1.5 hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="다음 달"
            >
              <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 mb-2" role="row">
            {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1" role="columnheader">
                {d}
              </div>
            ))}
          </div>

          {isLoading ? (
            <LoadingSkeleton rows={5} />
          ) : error ? (
            <ErrorMessage message="일정을 불러오지 못했습니다." onRetry={() => refetch()} />
          ) : (
            <div className="grid grid-cols-7 gap-px" role="grid" aria-label="달력">
              {/* 첫 주 빈 칸 */}
              {Array.from({ length: days[0].getDay() }).map((_, i) => (
                <div key={`empty-${i}`} className="h-12" aria-hidden="true" />
              ))}
              {days.map((day) => {
                const daySchedules = getSchedulesForDay(day);
                const isToday = isSameDay(day, today);
                const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
                const isCurrentMonth = isSameMonth(day, currentMonth);
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    role="gridcell"
                    aria-label={`${format(day, 'M월 d일', { locale: ko })}${daySchedules.length ? `, 일정 ${daySchedules.length}건` : ''}`}
                    aria-pressed={isSelected}
                    className={cn(
                      'h-12 flex flex-col items-center pt-1 rounded-lg text-xs transition-colors relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      isSelected ? 'bg-primary/10' : 'hover:bg-accent',
                      !isCurrentMonth && 'opacity-30',
                    )}
                  >
                    <span className={cn(
                      'h-6 w-6 flex items-center justify-center rounded-full font-medium',
                      isToday && 'bg-primary text-primary-foreground',
                    )}>
                      {day.getDate()}
                    </span>
                    {daySchedules.length > 0 && (
                      <div className="flex gap-0.5 mt-0.5" aria-hidden="true">
                        {daySchedules.slice(0, 3).map((_, i) => (
                          <div key={i} className="h-1 w-1 rounded-full bg-primary" />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* 선택된 날 일정 목록 */}
        <section className={cn(GLASS.card, 'p-5')} aria-labelledby="day-schedule-heading">
          <h2 id="day-schedule-heading" className="text-sm font-semibold text-foreground mb-4">
            {selectedDate
              ? format(selectedDate, 'M월 d일 (eee)', { locale: ko })
              : '날짜를 선택하세요'}
          </h2>

          {!selectedDate ? (
            <EmptyState message="날짜를 선택하면 일정을 확인할 수 있습니다." />
          ) : !selectedDaySchedules.length ? (
            <EmptyState message="이날 일정이 없습니다." />
          ) : (
            <ul className="space-y-2" aria-label="선택한 날의 일정">
              {selectedDaySchedules.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => setDetailId(s.id)}
                    className="w-full text-left rounded-lg p-3 hover:bg-accent transition-colors border border-border/50 group"
                  >
                    <p className="text-sm font-medium text-foreground group-hover:text-primary truncate">{s.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(s.startAt), 'HH:mm')} – {format(new Date(s.endAt), 'HH:mm')}
                      {s.location && ` · ${s.location}`}
                      {s.isOnline && ' · 온라인'}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* 일정 생성 모달 */}
      <CreateScheduleModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => setCreateOpen(false)}
      />

      {/* 일정 상세 모달 */}
      {detailId && (
        <ScheduleDetailModal
          id={detailId}
          onClose={() => setDetailId(null)}
          onDelete={(id) => {
            setDeleteTarget(id);
            setDetailId(null);
          }}
        />
      )}

      {/* 삭제 확인 다이얼로그 */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="일정 삭제"
        description="이 일정을 삭제하시겠습니까? 삭제된 일정은 복구할 수 없습니다."
        confirmLabel="삭제"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={async () => {
          if (!deleteTarget) return;
          await deleteSchedule(deleteTarget);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}

function CreateScheduleModal({
  open,
  onOpenChange,
  onCreated,
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onCreated: () => void;
}) {
  const { mutateAsync: createSchedule } = useCreateSchedule();
  const { data: users = [] } = useUsers();
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CreateSchedule>({
    defaultValues: { isOnline: false, attendeeIds: [] },
  });

  const onSubmit = async (data: CreateSchedule) => {
    setError(null);
    try {
      await createSchedule(data);
      reset();
      onCreated();
    } catch {
      setError('일정 생성에 실패했습니다.');
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) reset();
    onOpenChange(open);
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-[200]" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-[200] -translate-x-1/2 -translate-y-1/2 w-full max-w-lg app-glass-card p-6 shadow-lg"
          aria-describedby="create-schedule-desc"
        >
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-base font-semibold">새 일정</Dialog.Title>
            <Dialog.Close className="rounded-md p-1.5 hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="닫기">
              <XIcon className="h-4 w-4" aria-hidden="true" />
            </Dialog.Close>
          </div>
          <Dialog.Description id="create-schedule-desc" className="sr-only">새 일정을 등록합니다.</Dialog.Description>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {error && <div role="alert" className="text-sm text-destructive bg-destructive/10 rounded-md p-3">{error}</div>}

            <div className="space-y-1.5">
              <label htmlFor="s-title" className="text-sm font-medium">제목 *</label>
              <input id="s-title" type="text" className="w-full rounded-md border border-input px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" {...register('title')} />
              {errors.title && <p role="alert" className="text-xs text-destructive">{errors.title.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="s-start" className="text-sm font-medium">시작 *</label>
                <input id="s-start" type="datetime-local" className="w-full rounded-md border border-input px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" {...register('startAt')} />
                {errors.startAt && <p role="alert" className="text-xs text-destructive">{errors.startAt.message}</p>}
              </div>
              <div className="space-y-1.5">
                <label htmlFor="s-end" className="text-sm font-medium">종료 *</label>
                <input id="s-end" type="datetime-local" className="w-full rounded-md border border-input px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" {...register('endAt')} />
                {errors.endAt && <p role="alert" className="text-xs text-destructive">{errors.endAt.message}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="s-location" className="text-sm font-medium">장소</label>
              <input id="s-location" type="text" className="w-full rounded-md border border-input px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" {...register('location')} />
            </div>

            <div className="flex items-center gap-2">
              <input id="s-online" type="checkbox" className="h-4 w-4 rounded border-input focus:ring-2 focus:ring-ring" {...register('isOnline')} />
              <label htmlFor="s-online" className="text-sm font-medium">온라인 회의</label>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="s-attendees" className="text-sm font-medium">참석자</label>
              <select id="s-attendees" multiple className="w-full rounded-md border border-input px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring h-24" {...register('attendeeIds')}>
                {(users as User[]).map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Dialog.Close className="rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">취소</Dialog.Close>
              <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {isSubmitting && <LoaderIcon className="h-4 w-4 animate-spin" />}
                {isSubmitting ? '저장 중...' : '일정 저장'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

interface EditScheduleForm {
  title: string;
  startAt: string;
  endAt: string;
  location: string;
  description: string;
}

function ScheduleDetailModal({
  id,
  onClose,
  onDelete,
}: {
  readonly id: string;
  readonly onClose: () => void;
  readonly onDelete: (id: string) => void;
}) {
  const { user } = useAuth();
  const { data: schedule, isLoading } = useSchedule(id);
  const { mutateAsync: respond, isPending: isResponding } = useRespondSchedule();
  const { mutateAsync: updateSchedule } = useUpdateSchedule();
  const [isEditing, setIsEditing] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const s = schedule as Schedule | null;
  const myAttendance = s?.attendees.find((a) => a.userId === user?.id);
  const isOrganizer = s?.organizerId === user?.id;

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<EditScheduleForm>({
    values: s
      ? {
          title: s.title,
          startAt: s.startAt.slice(0, 16),  // datetime-local 형식: YYYY-MM-DDTHH:mm
          endAt: s.endAt.slice(0, 16),
          location: s.location ?? '',
          description: s.description ?? '',
        }
      : undefined,
  });

  const handleEditToggle = () => {
    setIsEditing((prev) => !prev);
    setUpdateError(null);
    if (isEditing) reset();
  };

  const onSubmit = async (formData: EditScheduleForm) => {
    setUpdateError(null);
    try {
      await updateSchedule({
        id,
        title: formData.title,
        startAt: new Date(formData.startAt).toISOString(),
        endAt: new Date(formData.endAt).toISOString(),
        location: formData.location || undefined,
        description: formData.description || undefined,
      });
      setIsEditing(false);
    } catch {
      setUpdateError('일정 수정에 실패했습니다.');
    }
  };

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-[200]" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-[200] -translate-x-1/2 -translate-y-1/2 w-full max-w-md app-glass-card p-6 shadow-lg"
          aria-describedby="schedule-detail-desc"
        >
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-base font-semibold">
              {isEditing ? '일정 수정' : '일정 상세'}
            </Dialog.Title>
            <div className="flex items-center gap-1">
              {isOrganizer && !isLoading && s && (
                <button
                  onClick={handleEditToggle}
                  className="rounded-md p-1.5 hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={isEditing ? '수정 취소' : '일정 수정'}
                >
                  <PencilIcon className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
              <Dialog.Close
                className="rounded-md p-1.5 hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="닫기"
              >
                <XIcon className="h-4 w-4" />
              </Dialog.Close>
            </div>
          </div>
          <Dialog.Description id="schedule-detail-desc" className="sr-only">일정 상세 정보입니다.</Dialog.Description>

          {isLoading ? (
            <LoadingSkeleton rows={4} />
          ) : !s ? (
            <ErrorMessage message="일정 정보를 불러오지 못했습니다." />
          ) : isEditing ? (
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              {updateError && (
                <div role="alert" className="text-sm text-destructive bg-destructive/10 rounded-md p-3">
                  {updateError}
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="e-title" className="text-sm font-medium">제목 *</label>
                <input
                  id="e-title"
                  type="text"
                  className="w-full rounded-md border border-input px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  {...register('title', { required: '제목을 입력하세요.' })}
                />
                {errors.title && <p role="alert" className="text-xs text-destructive">{errors.title.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="e-start" className="text-sm font-medium">시작 *</label>
                  <input
                    id="e-start"
                    type="datetime-local"
                    className="w-full rounded-md border border-input px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    {...register('startAt', { required: '시작 일시를 입력하세요.' })}
                  />
                  {errors.startAt && <p role="alert" className="text-xs text-destructive">{errors.startAt.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="e-end" className="text-sm font-medium">종료 *</label>
                  <input
                    id="e-end"
                    type="datetime-local"
                    className="w-full rounded-md border border-input px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    {...register('endAt', { required: '종료 일시를 입력하세요.' })}
                  />
                  {errors.endAt && <p role="alert" className="text-xs text-destructive">{errors.endAt.message}</p>}
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="e-location" className="text-sm font-medium">장소</label>
                <input
                  id="e-location"
                  type="text"
                  className="w-full rounded-md border border-input px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  {...register('location')}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="e-description" className="text-sm font-medium">설명</label>
                <textarea
                  id="e-description"
                  rows={3}
                  className="w-full rounded-md border border-input px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  {...register('description')}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleEditToggle}
                  className="rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {isSubmitting ? (
                    <LoaderIcon className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <CheckIcon className="h-4 w-4" aria-hidden="true" />
                  )}
                  {isSubmitting ? '저장 중...' : '저장'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-foreground">{s.title}</h3>
                {s.description && <p className="text-sm text-muted-foreground mt-1">{s.description}</p>}
              </div>

              <div className="space-y-1.5 text-sm">
                <p><span className="text-muted-foreground">일시:</span> {format(new Date(s.startAt), 'yyyy.MM.dd HH:mm', { locale: ko })} – {format(new Date(s.endAt), 'HH:mm', { locale: ko })}</p>
                {s.location && <p><span className="text-muted-foreground">장소:</span> {s.location}</p>}
                {s.isOnline && <p className="text-primary text-xs">온라인 회의</p>}
              </div>

              <div>
                <p className="text-sm font-medium text-foreground mb-1">참석자 ({s.attendees.length}명)</p>
                <ul className="flex flex-wrap gap-1">
                  {s.attendees.map((a) => (
                    <li key={a.userId} className={cn('text-xs px-2 py-0.5 rounded-full', a.status === 'accepted' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : a.status === 'declined' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-muted text-muted-foreground')}>
                      {a.userId.slice(0, 8)}... ({a.status === 'accepted' ? '수락' : a.status === 'declined' ? '거절' : '초대됨'})
                    </li>
                  ))}
                </ul>
              </div>

              {myAttendance && myAttendance.status === 'invited' && (
                <div className="flex gap-3">
                  <button
                    onClick={() => respond({ id: s.id, response: 'accept' }).then(onClose)}
                    disabled={isResponding}
                    className="flex-1 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    수락
                  </button>
                  <button
                    onClick={() => respond({ id: s.id, response: 'decline' }).then(onClose)}
                    disabled={isResponding}
                    className="flex-1 rounded-md bg-destructive px-3 py-2 text-sm font-medium text-white hover:bg-destructive/90 disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    거절
                  </button>
                </div>
              )}

              {isOrganizer && (
                <button
                  onClick={() => onDelete(s.id)}
                  className="w-full rounded-md border border-destructive/30 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  일정 삭제
                </button>
              )}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
