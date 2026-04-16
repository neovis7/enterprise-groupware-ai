import { cn } from '@/lib/utils';
import { InboxIcon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  readonly icon?: LucideIcon;
  readonly title?: string;
  readonly message: string;
  readonly action?: React.ReactNode;
  readonly className?: string;
}

export function EmptyState({
  icon: Icon = InboxIcon,
  title,
  message,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 px-4 text-center',
        className,
      )}
      role="status"
      aria-label={title ?? message}
    >
      <div className="rounded-full bg-muted p-4 mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
      </div>
      {title && (
        <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
      )}
      <p className="text-sm text-muted-foreground max-w-sm">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
