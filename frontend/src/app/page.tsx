import { redirect } from 'next/navigation';

/**
 * 루트 경로 — /dashboard로 리다이렉트합니다.
 * 인증되지 않은 사용자는 proxy.ts에서 /login으로 다시 리다이렉트됩니다.
 */
export default function RootPage() {
  redirect('/dashboard');
}
