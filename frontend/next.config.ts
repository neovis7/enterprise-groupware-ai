import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // API 요청을 백엔드 FastAPI 서버로 프록시
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ];
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
