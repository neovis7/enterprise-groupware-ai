import { cn } from '@/lib/utils';
import { STATUS_COLORS, type ApprovalStatus } from '@/lib/design-tokens';

interface ApprovalStatusBadgeProps {
  readonly status: ApprovalStatus;
  readonly className?: string;
}

export function ApprovalStatusBadge({ status, className }: ApprovalStatusBadgeProps) {
  const colors = STATUS_COLORS[status];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        colors.badgeClass,
        className,
      )}
      aria-label={`결재 상태: ${colors.label}`}
    >
      {colors.label}
    </span>
  );
}
