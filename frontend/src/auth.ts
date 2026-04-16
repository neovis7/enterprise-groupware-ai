/**
 * NextAuth.js v5 설정
 * - Credentials Provider: 이메일/PW → FastAPI /api/auth/login 호출
 * - JWT 전략: accessToken은 httpOnly 쿠키, 세션에 user info 유지
 */
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { LoginRequestSchema } from '@/types/api-contracts';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: '이메일', type: 'email' },
        password: { label: '비밀번호', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = LoginRequestSchema.safeParse(credentials);
        if (!parsed.success) return null;

        try {
          const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(parsed.data),
          });

          if (!response.ok) return null;

          const json = await response.json();
          if (!json?.access_token || !json?.user) return null;

          const { access_token: accessToken, user } = json;
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            departmentId: user.department_id,
            avatarUrl: user.avatar_url,
            accessToken,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7일
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        return {
          ...token,
          id: user.id as string,
          role: (user as { role: string }).role,
          departmentId: (user as { departmentId: string }).departmentId,
          avatarUrl: (user as { avatarUrl: string | null }).avatarUrl,
          accessToken: (user as { accessToken: string }).accessToken,
        };
      }

      // 토큰 갱신 시도 (accessToken 만료 근접 시)
      return token;
    },
    async session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.id as string,
          role: token.role as string,
          departmentId: token.departmentId as string,
          avatarUrl: token.avatarUrl as string | null,
        },
        accessToken: token.accessToken as string,
      };
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  cookies: {
    sessionToken: {
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
});
