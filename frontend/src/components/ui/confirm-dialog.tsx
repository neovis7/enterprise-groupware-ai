'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { AlertTriangleIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConfirmDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly title: string;
  readonly description: string;
  readonly confirmLabel?: string;
  readonly cancelLabel?: string;
  readonly onConfirm: () => void;
  readonly variant?: 'default' | 'destructive';
  readonly isLoading?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = '확인',
  cancelLabel = '취소',
  onConfirm,
  variant = 'default',
  isLoading = false,
}: ConfirmDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-[200] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-[200] -translate-x-1/2 -translate-y-1/2 w-full max-w-md app-glass-card p-6 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          aria-describedby="confirm-dialog-description"
        >
          <div className="flex items-start gap-4">
            {variant === 'destructive' && (
              <div className="flex-shrink-0 rounded-full bg-destructive/10 p-2">
                <AlertTriangleIcon className="h-5 w-5 text-destructive" aria-hidden="true" />
              </div>
            )}
            <div className="flex-1">
              <Dialog.Title className="text-base font-semibold text-foreground">
                {title}
              </Dialog.Title>
              <Dialog.Description
                id="confirm-dialog-description"
                className="mt-1 text-sm text-muted-foreground"
              >
                {description}
              </Dialog.Description>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Dialog.Close asChild>
              <button
                className="rounded-md px-4 py-2 text-sm font-medium text-foreground border border-border hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                disabled={isLoading}
              >
                {cancelLabel}
              </button>
            </Dialog.Close>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={cn(
                'inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
                variant === 'destructive'
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90',
              )}
            >
              {isLoading && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
              )}
              {confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
