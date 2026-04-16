'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { EyeIcon, EyeOffIcon, SparklesIcon, LoaderIcon } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import type { LoginRequest } from '@/types/api-contracts';
import { GLASS } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/dashboard';
  const { signIn } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginRequest>();

  const onSubmit = async (data: LoginRequest) => {
    setAuthError(null);
    try {
      const result = await signIn(data);
      if (result?.error) {
        setAuthError('이메일 또는 비밀번호가 올바르지 않습니다.');
        return;
      }
      router.push(callbackUrl);
      router.refresh();
    } catch {
      setAuthError('로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-950 p-4">
      <div className={cn(GLASS.card, 'w-full max-w-md p-8 space-y-6')}>
        {/* 로고 */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-2">
            <SparklesIcon className="h-7 w-7 text-primary" aria-hidden="true" />
            <span className="text-2xl font-bold text-foreground">GroupWare</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold">AI</span>
          </div>
          <p className="text-sm text-muted-foreground">계정에 로그인하세요</p>
        </div>

        {/* 에러 메시지 */}
        {authError && (
          <div
            role="alert"
            aria-live="assertive"
            className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive"
          >
            {authError}
          </div>
        )}

        {/* 로그인 폼 */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {/* 이메일 */}
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              이메일
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="name@company.com"
              aria-describedby={errors.email ? 'email-error' : undefined}
              aria-invalid={errors.email ? 'true' : 'false'}
              className={cn(
                'w-full rounded-md border px-3 py-2 text-sm bg-background text-foreground placeholder:text-muted-foreground',
                'focus:outline-none focus:ring-2 focus:ring-ring',
                errors.email ? 'border-destructive' : 'border-input',
              )}
              {...register('email')}
            />
            {errors.email && (
              <p id="email-error" role="alert" className="text-xs text-destructive">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* 비밀번호 */}
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              비밀번호
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                aria-describedby={errors.password ? 'password-error' : undefined}
                aria-invalid={errors.password ? 'true' : 'false'}
                className={cn(
                  'w-full rounded-md border px-3 py-2 pr-10 text-sm bg-background text-foreground placeholder:text-muted-foreground',
                  'focus:outline-none focus:ring-2 focus:ring-ring',
                  errors.password ? 'border-destructive' : 'border-input',
                )}
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 표시'}
              >
                {showPassword ? (
                  <EyeOffIcon className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <EyeIcon className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
            {errors.password && (
              <p id="password-error" role="alert" className="text-xs text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* 로그인 버튼 */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-busy={isSubmitting}
          >
            {isSubmitting && (
              <LoaderIcon className="h-4 w-4 animate-spin" aria-hidden="true" />
            )}
            {isSubmitting ? '로그인 중...' : '로그인'}
          </button>
        </form>

        {/* 구분선 */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">또는</span>
          </div>
        </div>

        {/* SSO 버튼 */}
        <button
          type="button"
          className="w-full flex items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => {
            // SSO/SAML 로그인 — 백엔드 SSO 엔드포인트로 리다이렉트
            window.location.href = `${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/auth/sso`;
          }}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"
              fill="currentColor"
            />
          </svg>
          SSO로 로그인
        </button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
