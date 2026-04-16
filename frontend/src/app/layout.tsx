import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/lib/providers';

export const metadata: Metadata = {
  title: {
    default: '그룹웨어 AI',
    template: '%s | 그룹웨어 AI',
  },
  description: 'AI 기능 중심 대기업 그룹웨어',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full bg-background text-foreground">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[999] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:text-sm focus:font-medium">
          본문으로 건너뛰기
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
