'use client';

import { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import { ChevronLeftIcon, ChevronRightIcon, ClockIcon, LoaderIcon, XIcon } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { useForm } from 'react-hook-form';
import { useAttendance, useCheckin, useCheckout, useLeaves, useCreateLeave } from '@/hooks/use-attendance';
import { LoadingSkeleton, PageLoading } from '@/components/ui/loading-spinner';
import { ErrorMessage } from '@/components/ui/error-message';
import { EmptyState } from '@/components/ui/empty-state';
import { GLASS } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';

interface AttendanceRecord {
  date: string;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  totalHours: number | null;
  status: 'present' | 'absent' | 'leave' | 'holiday';
}

interface Leave {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface LeaveFormData {
  type: 'annual' | 'sick' | 'special';
  startDate: string;
  endDate: string;
  reason: string;
}

export default function AttendancePage() {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today);
  const [leaveOpen, setLeaveOpen] = useState(false);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth() + 1;

  const { data: attendance, isLoading, error, refetch } = useAttendance(year, month);
  const { data: leaves, isLoading: leavesLoading } = useLeaves();
  const { mutateAsync: checkin, isPending: isCheckingIn } = useCheckin();
  const { mutateAsync: checkout, isPending: isCheckingOut } = useCheckout();

  const records = (attendance as AttendanceRecord[] | undefined) ?? [];
  const leaveList = (leaves as Leave[] | undefined) ?? [];

  // 오늘 체크인 상태
  const todayRecord = records.find((r) => isSameDay(new Date(r.date), today));
  const hasCheckedIn = Boolean(todayRecord?.checkedInAt);
  const hasCheckedOut = Boolean(todayRecord?.checkedOutAt);

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'present': return 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400';
      case 'absent': return 'bg-red-500/20 text-red-700 dark:text-red-400';
      case 'leave': return 'bg-blue-500/20 text-blue-700 dark:text-blue-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (isLoading) return <PageLoading />;
  if (error) return <ErrorMessage message="근태 정보를 불러오지 못했습니다." onRetry={() => refetch()} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">근태관리</h1>
          <p className="text-sm text-muted-foreground mt-0.5">출퇴근 기록과 휴가를 관리합니다.</p>
        </div>
      </div>

      {/* 체크인/체크아웃 */}
      <section className={cn(GLASS.card, 'p-5')} aria-labelledby="checkinout-heading">
        <h2 id="checkinout-heading" className="text-sm font-semibold text-foreground mb-4">
          오늘 근태 — {format(today, 'yyyy년 M월 d일 (eee)', { locale: ko })}
        </h2>
        <div className="flex items-center gap-4">
          <button
            onClick={() => checkin()}
            disabled={hasCheckedIn || isCheckingIn}
            className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="출근 체크인"
          >
            {isCheckingIn ? <LoaderIcon className="h-4 w-4 animate-spin" /> : <ClockIcon className="h-4 w-4" />}
            {hasCheckedIn ? `출근 ${format(new Date(todayRecord!.checkedInAt!), 'HH:mm')}` : '출근'}
          </button>
          <button
            onClick={() => checkout()}
            disabled={!hasCheckedIn || hasCheckedOut || isCheckingOut}
            className="inline-flex items-center gap-2 rounded-md bg-slate-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="퇴근 체크아웃"
          >
            {isCheckingOut ? <LoaderIcon className="h-4 w-4 animate-spin" /> : <ClockIcon className="h-4 w-4" />}
            {hasCheckedOut ? `퇴근 ${format(new Date(todayRecord!.checkedOutAt!), 'HH:mm')}` : '퇴근'}
          </button>
          <button
            onClick={() => setLeaveOpen(true)}
            className="inline-flex items-center gap-2 rounded-md border border-input px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            휴가 신청
          </button>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 월별 달력 */}
        <section className={cn(GLASS.card, 'p-5 lg:col-span-2')} aria-labelledby="attendance-calendar-heading">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1))} className="rounded-md p-1.5 hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="이전 달">
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
            <h2 id="attendance-calendar-heading" className="text-sm font-semibold">{format(currentMonth, 'yyyy년 M월', { locale: ko })}</h2>
            <button onClick={() => setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1))} className="rounded-md p-1.5 hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="다음 달">
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 mb-2">
            {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-px">
            {Array.from({ length: days[0].getDay() }).map((_, i) => (
              <div key={`e-${i}`} className="h-14" />
            ))}
            {days.map((day) => {
              const record = records.find((r) => isSameDay(new Date(r.date), day));
              const isToday = isSameDay(day, today);
              return (
                <div key={day.toISOString()} className={cn('h-14 rounded-lg p-1 text-xs flex flex-col items-center gap-0.5', isToday && 'ring-2 ring-primary ring-offset-1')}>
                  <span className={cn('h-5 w-5 flex items-center justify-center rounded-full font-medium text-xs', isToday && 'bg-primary text-primary-foreground')}>
                    {day.getDate()}
                  </span>
                  {record?.status && (
                    <span className={cn('text-[10px] px-1 rounded-full', getStatusColor(record.status))}>
                      {record.status === 'present' ? '출근' : record.status === 'absent' ? '결근' : record.status === 'leave' ? '휴가' : '-'}
                    </span>
                  )}
                  {record?.totalHours && (
                    <span className="text-[10px] text-muted-foreground">{record.totalHours}h</span>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* 휴가 신청 목록 */}
        <section className={cn(GLASS.card, 'p-5')} aria-labelledby="leaves-heading">
          <h2 id="leaves-heading" className="text-sm font-semibold text-foreground mb-4">내 휴가 신청</h2>
          {leavesLoading ? (
            <LoadingSkeleton rows={3} />
          ) : !leaveList.length ? (
            <EmptyState message="신청한 휴가가 없습니다." />
          ) : (
            <ul className="space-y-2">
              {leaveList.map((leave) => (
                <li key={leave.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground">
                      {leave.type === 'annual' ? '연차' : leave.type === 'sick' ? '병가' : '특별휴가'}
                    </span>
                    <span className={cn('text-xs px-1.5 py-0.5 rounded-full', leave.status === 'approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : leave.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700')}>
                      {leave.status === 'approved' ? '승인' : leave.status === 'rejected' ? '반려' : '대기'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(leave.startDate), 'M.d')} – {format(new Date(leave.endDate), 'M.d', { locale: ko })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* 휴가 신청 모달 */}
      <LeaveRequestModal open={leaveOpen} onOpenChange={setLeaveOpen} />
    </div>
  );
}

function LeaveRequestModal({
  open,
  onOpenChange,
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}) {
  const { mutateAsync: createLeave } = useCreateLeave();
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<LeaveFormData>({
    defaultValues: { type: 'annual' },
  });

  const handleOpenChange = (open: boolean) => {
    if (!open) { reset(); setError(null); }
    onOpenChange(open);
  };

  const onSubmit = async (data: LeaveFormData) => {
    setError(null);
    try {
      await createLeave(data);
      reset();
      onOpenChange(false);
    } catch {
      setError('휴가 신청에 실패했습니다.');
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-[200]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[200] -translate-x-1/2 -translate-y-1/2 w-full max-w-md app-glass-card p-6 shadow-lg" aria-describedby="leave-desc">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-base font-semibold">휴가 신청</Dialog.Title>
            <Dialog.Close className="rounded-md p-1.5 hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="닫기">
              <XIcon className="h-4 w-4" />
            </Dialog.Close>
          </div>
          <Dialog.Description id="leave-desc" className="sr-only">휴가 신청 폼입니다.</Dialog.Description>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && <div role="alert" className="text-sm text-destructive bg-destructive/10 rounded-md p-3">{error}</div>}

            <div className="space-y-1.5">
              <label htmlFor="l-type" className="text-sm font-medium">휴가 종류</label>
              <select id="l-type" className="w-full rounded-md border border-input px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" {...register('type')}>
                <option value="annual">연차</option>
                <option value="sick">병가</option>
                <option value="special">특별휴가</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="l-start" className="text-sm font-medium">시작일</label>
                <input id="l-start" type="date" className="w-full rounded-md border border-input px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" {...register('startDate', { required: true })} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="l-end" className="text-sm font-medium">종료일</label>
                <input id="l-end" type="date" className="w-full rounded-md border border-input px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" {...register('endDate', { required: true })} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="l-reason" className="text-sm font-medium">사유</label>
              <textarea id="l-reason" rows={3} className="w-full rounded-md border border-input px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring" {...register('reason', { required: true })} />
            </div>

            <div className="flex justify-end gap-3">
              <Dialog.Close className="rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">취소</Dialog.Close>
              <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {isSubmitting && <LoaderIcon className="h-4 w-4 animate-spin" />}
                {isSubmitting ? '신청 중...' : '신청하기'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
