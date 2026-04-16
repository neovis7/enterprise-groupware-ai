import { AlertCircleIcon, RefreshCwIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ErrorMessageProps {
  readonly message?: string;
  readonly onRetry?: () => void;
  readonly className?: string;
}

export function ErrorMessage({
  message = '오류가 발생했습니다.',
  onRetry,
  className,
}: ErrorMessageProps) {
  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className,
      )}
    >
      <div className="rounded-full bg-destructive/10 p-4 mb-4">
        <AlertCircleIcon className="h-8 w-8 text-destructive" aria-hidden="true" />
      </div>
      <p className="text-sm text-muted-foreground mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="다시 시도"
        >
          <RefreshCwIcon className="h-4 w-4" aria-hidden="true" />
          다시 시도
        </button>
      )}
    </div>
  );
}
