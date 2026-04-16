/**
 * NextAuth.js v5 타입 확장
 * - Session.user에 role, departmentId, avatarUrl 추가
 * - Session에 accessToken 추가
 */
import 'next-auth';

declare module 'next-auth' {
  interface Session {
    accessToken: string;
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: string;
      departmentId: string;
      avatarUrl: string | null;
    };
  }

  interface User {
    role: string;
    departmentId: string;
    avatarUrl: string | null;
    accessToken: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: string;
    departmentId: string;
    avatarUrl: string | null;
    accessToken: string;
  }
}
