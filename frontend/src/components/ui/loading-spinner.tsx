import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  readonly size?: 'sm' | 'md' | 'lg';
  readonly className?: string;
  readonly label?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-4',
} as const;

export function LoadingSpinner({
  size = 'md',
  className,
  label = '로딩 중...',
}: LoadingSpinnerProps) {
  return (
    <div
      role="status"
      aria-label={label}
      className={cn('flex items-center justify-center', className)}
    >
      <div
        className={cn(
          'animate-spin motion-reduce:animate-none rounded-full border-primary border-t-transparent',
          sizeClasses[size],
        )}
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function PageLoading() {
  return (
    <div className="flex h-64 items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  );
}

export function LoadingSkeleton({ rows = 3 }: { readonly rows?: number }) {
  return (
    <div className="space-y-3 animate-pulse" aria-label="로딩 중..." role="status">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-16 rounded-lg bg-muted" />
      ))}
      <span className="sr-only">로딩 중...</span>
    </div>
  );
}
