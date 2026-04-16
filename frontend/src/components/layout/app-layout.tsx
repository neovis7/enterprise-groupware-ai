'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './sidebar';
import { Header } from './header';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': '대시보드',
  '/approvals': '결재함',
  '/approvals/compose': '결재 기안',
  '/approvals/inbox': '수신함',
  '/messages': '메시지',
  '/schedule': '일정',
  '/posts': '공지사항',
  '/posts/admin': '공지 관리',
  '/ai': 'AI 어시스턴트',
  '/attendance': '근태관리',
  '/files': '파일 드라이브',
  '/projects': '프로젝트',
  '/admin/users': '사용자 관리',
  '/admin/departments': '부서 관리',
  '/admin/settings': '시스템 설정',
};

function getTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  // 동적 라우트 매칭
  if (pathname.startsWith('/approvals/')) return '결재 상세';
  if (pathname.startsWith('/posts/')) return '공지 상세';
  if (pathname.startsWith('/projects/')) return '프로젝트 상세';
  return '그룹웨어';
}

interface AppLayoutProps {
  readonly children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const title = getTitle(pathname);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50/60 to-indigo-100/80">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* 메인 콘텐츠 (사이드바 너비만큼 오프셋) */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        <Header
          title={title}
          onMenuToggle={() => setSidebarOpen((prev) => !prev)}
          isSidebarOpen={sidebarOpen}
        />
        <main className="flex-1 p-4 md:p-6 lg:p-8" id="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
