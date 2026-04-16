'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useCallback } from 'react';
import type { LoginRequest } from '@/types/api-contracts';

export function useAuth() {
  const { data: session, status } = useSession();

  const handleSignIn = useCallback(async (credentials: LoginRequest) => {
    const result = await signIn('credentials', {
      email: credentials.email,
      password: credentials.password,
      redirect: false,
    });
    return result;
  }, []);

  const handleSignOut = useCallback(async () => {
    await signOut({ callbackUrl: '/login' });
  }, []);

  return {
    user: session?.user ?? null,
    accessToken: (session as { accessToken?: string } | null)?.accessToken ?? null,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
    signIn: handleSignIn,
    signOut: handleSignOut,
  };
}
