'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import {
  LayoutDashboardIcon,
  FileCheckIcon,
  PenLineIcon,
  InboxIcon,
  MessageSquareIcon,
  CalendarIcon,
  MegaphoneIcon,
  SettingsIcon,
  SparklesIcon,
  UsersIcon,
  BuildingIcon,
  SlidersHorizontalIcon,
  ClockIcon,
  FolderIcon,
  KanbanIcon,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles?: string[];
  children?: NavItem[];
}

const NAV_ITEMS: NavItem[] = [
  { label: '대시보드', href: '/dashboard', icon: LayoutDashboardIcon },
  {
    label: '결재함',
    href: '/approvals',
    icon: FileCheckIcon,
    children: [
      { label: '기안', href: '/approvals/compose', icon: PenLineIcon },
      { label: '수신함', href: '/approvals/inbox', icon: InboxIcon },
    ],
  },
  { label: '메시지', href: '/messages', icon: MessageSquareIcon },
  { label: '일정', href: '/schedule', icon: CalendarIcon },
  {
    label: '공지사항',
    href: '/posts',
    icon: MegaphoneIcon,
    children: [
      {
        label: '관리',
        href: '/posts/admin',
        icon: SettingsIcon,
        roles: ['admin', 'manager'],
      },
    ],
  },
  { label: 'AI 어시스턴트', href: '/ai', icon: SparklesIcon },
  { label: '근태관리', href: '/attendance', icon: ClockIcon },
  { label: '파일 드라이브', href: '/files', icon: FolderIcon },
  { label: '프로젝트', href: '/projects', icon: KanbanIcon },
  {
    label: '조직관리',
    href: '/admin/users',
    icon: UsersIcon,
    roles: ['admin'],
    children: [
      { label: '사용자', href: '/admin/users', icon: UsersIcon, roles: ['admin'] },
      { label: '부서', href: '/admin/departments', icon: BuildingIcon, roles: ['admin'] },
      { label: '시스템설정', href: '/admin/settings', icon: SlidersHorizontalIcon, roles: ['admin'] },
    ],
  },
];

interface SidebarProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const role = user?.role ?? 'employee';

  const isAllowed = (item: NavItem) =>
    !item.roles || item.roles.includes(role);

  const isActive = (href: string) =>
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href));

  return (
    <>
      {/* 모바일 오버레이 */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 h-full w-64 z-[110] flex flex-col',
          'bg-slate-900 rounded-none border-r border-slate-700/60',
          'transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
        aria-label="사이드바 내비게이션"
      >
        {/* 로고 */}
        <div className="flex h-16 items-center px-5 border-b border-slate-700/60 flex-shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 rounded">
            <span className="text-xl font-bold text-white">GroupWare</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-500/30 text-indigo-300 font-semibold">AI</span>
          </Link>
        </div>

        {/* 네비게이션 */}
        <nav className="flex-1 overflow-y-auto py-4 px-3" aria-label="메인 메뉴">
          <ul className="space-y-0.5" role="list">
            {NAV_ITEMS.filter(isAllowed).map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => onClose()}
                  aria-current={isActive(item.href) ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive(item.href)
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:bg-slate-700/60 hover:text-slate-100',
                  )}
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  {item.label}
                </Link>

                {/* 하위 메뉴 */}
                {item.children && isActive(item.href) && (
                  <ul className="mt-1 ml-4 space-y-0.5 pl-3 border-l border-slate-700" role="list">
                    {item.children.filter(isAllowed).map((child) => (
                      <li key={child.href}>
                        <Link
                          href={child.href}
                          onClick={() => onClose()}
                          aria-current={pathname === child.href ? 'page' : undefined}
                          className={cn(
                            'flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
                            pathname === child.href
                              ? 'text-indigo-300 bg-indigo-500/10'
                              : 'text-slate-500 hover:text-slate-200 hover:bg-slate-700/50',
                          )}
                        >
                          <child.icon className="h-3.5 w-3.5" aria-hidden="true" />
                          {child.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </nav>

        {/* 사용자 정보 */}
        {user && (
          <div className="border-t border-slate-700/60 px-4 py-3 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-white" aria-hidden="true">
                  {user.name?.slice(0, 1) ?? '?'}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-100 truncate">{user.name}</p>
                <p className="text-xs text-slate-400 truncate">{user.email}</p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
