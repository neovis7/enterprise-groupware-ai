/**
 * axios 인스턴스 + 인터셉터
 * - baseURL: NEXT_PUBLIC_API_URL
 * - 요청: Authorization 헤더 자동 추가
 * - 응답: 401 → /login 리다이렉트
 */
import axios from 'axios';
import { getSession, signOut } from 'next-auth/react';

export const apiClient = axios.create({
  // 상대 경로 사용 → Next.js 프록시(next.config.ts rewrite)를 통해 Railway로 전달
  // CORS 없음, NEXT_PUBLIC_API_URL 빌드 타임 의존 없음
  baseURL: '',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

apiClient.interceptors.request.use(async (config) => {
  const session = await getSession();
  if (session?.accessToken) {
    config.headers['Authorization'] = `Bearer ${session.accessToken}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await signOut({ callbackUrl: '/login' });
    }
    return Promise.reject(error instanceof Error ? error : new Error(String(error)));
  },
);
