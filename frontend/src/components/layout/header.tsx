'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BellIcon,
  MenuIcon,
  LogOutIcon,
  UserIcon,
  CheckCheckIcon,
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useNotifications, useReadNotification } from '@/hooks/use-notifications';
import type { Notification } from '@/types/api-contracts';

interface HeaderProps {
  readonly title: string;
  readonly onMenuToggle: () => void;
  readonly isSidebarOpen?: boolean;
}

export function Header({ title, onMenuToggle, isSidebarOpen }: HeaderProps) {
  const { user, signOut } = useAuth();
  const { data: notifications = [] } = useNotifications();
  const { mutate: readNotification } = useReadNotification();
  const router = useRouter();
  const [notifOpen, setNotifOpen] = useState(false);

  const unreadCount = (notifications as Notification[]).filter((n) => !n.isRead).length;

  const handleNotifClick = (notif: Notification) => {
    if (!notif.isRead) readNotification(notif.id);
    if (notif.relatedType === 'approval' && notif.relatedId) {
      router.push(`/approvals/${notif.relatedId}`);
    }
    setNotifOpen(false);
  };

  return (
    <header className="sticky top-0 z-[90] flex h-16 items-center gap-4 border-b border-white/60 px-4 bg-white/70 backdrop-blur-md rounded-none shadow-sm">
      {/* 모바일 햄버거 */}
      <button
        onClick={onMenuToggle}
        className="lg:hidden rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="사이드바 열기/닫기"
        aria-expanded={isSidebarOpen ?? false}
      >
        <MenuIcon className="h-5 w-5" aria-hidden="true" />
      </button>

      {/* 페이지 타이틀 */}
      <h1 className="flex-1 text-base font-semibold text-foreground truncate">{title}</h1>

      <div className="flex items-center gap-2">
        {/* 알림 드롭다운 */}
        <DropdownMenu.Root open={notifOpen} onOpenChange={setNotifOpen}>
          <DropdownMenu.Trigger asChild>
            <button
              className="relative rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`알림 ${unreadCount > 0 ? `(읽지 않은 알림 ${unreadCount}개)` : ''}`}
            >
              <BellIcon className="h-5 w-5" aria-hidden="true" />
              {unreadCount > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white"
                  aria-hidden="true"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="z-[200] w-80 app-glass-card shadow-lg overflow-hidden"
              sideOffset={8}
              align="end"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="text-sm font-semibold">알림</span>
                {unreadCount > 0 && (
                  <span className="text-xs text-muted-foreground">{unreadCount}개 읽지 않음</span>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {(notifications as Notification[]).length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <p className="text-sm text-muted-foreground">알림이 없습니다.</p>
                  </div>
                ) : (
                  (notifications as Notification[]).slice(0, 10).map((notif) => (
                    <DropdownMenu.Item
                      key={notif.id}
                      className={cn(
                        'flex items-start gap-3 px-4 py-3 cursor-pointer outline-none',
                        'hover:bg-accent transition-colors',
                        !notif.isRead && 'bg-primary/5',
                      )}
                      onSelect={() => handleNotifClick(notif)}
                    >
                      {!notif.isRead && (
                        <div className="h-2 w-2 rounded-full bg-primary mt-1.5 flex-shrink-0" aria-hidden="true" />
                      )}
                      {notif.isRead && (
                        <div className="h-2 w-2 mt-1.5 flex-shrink-0" aria-hidden="true" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{notif.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.body}</p>
                      </div>
                    </DropdownMenu.Item>
                  ))
                )}
              </div>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        {/* 사용자 메뉴 */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="사용자 메뉴"
            >
              <div
                className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0"
                aria-hidden="true"
              >
                <span className="text-xs font-semibold text-primary">
                  {user?.name?.slice(0, 1) ?? '?'}
                </span>
              </div>
              <span className="hidden sm:block text-sm font-medium text-foreground max-w-[100px] truncate">
                {user?.name}
              </span>
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="z-[200] w-48 app-glass-card shadow-lg overflow-hidden"
              sideOffset={8}
              align="end"
            >
              <DropdownMenu.Item
                className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer outline-none hover:bg-accent transition-colors"
                onSelect={() => router.push('/profile')}
              >
                <UserIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                내 프로필
              </DropdownMenu.Item>
              <DropdownMenu.Separator className="h-px bg-border my-1" />
              <DropdownMenu.Item
                className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer outline-none hover:bg-accent text-destructive transition-colors"
                onSelect={() => signOut()}
              >
                <LogOutIcon className="h-4 w-4" aria-hidden="true" />
                로그아웃
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  );
}
