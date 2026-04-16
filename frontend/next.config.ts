import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // API 요청을 백엔드 FastAPI 서버로 프록시 (/api/auth/*는 NextAuth가 처리하므로 제외)
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
    return {
      // afterFiles: 파일시스템 라우트(/api/auth/* = NextAuth) 처리 후에만 적용
      // → /api/auth/* 는 NextAuth가 먼저 처리, 나머지 /api/* 는 Railway로 프록시
      beforeFiles: [],
      afterFiles: [
        {
          source: '/api/:path*',
          destination: `${apiUrl}/api/:path*`,
        },
      ],
      fallback: [],
    };
  },

  // 외부 이미지 도메인 허용 (아바타 URL 등)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },

  // 엄격 모드 활성화
  reactStrictMode: true,
};

export default nextConfig;
