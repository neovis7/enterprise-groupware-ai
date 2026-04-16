'use client';

import { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { SendIcon, MessageSquareIcon, LoaderIcon } from 'lucide-react';
import { useMessageRooms, useMessages, useSendMessage } from '@/hooks/use-messages';
import { useAuth } from '@/hooks/use-auth';
import { LoadingSkeleton } from '@/components/ui/loading-spinner';
import { ErrorMessage } from '@/components/ui/error-message';
import { EmptyState } from '@/components/ui/empty-state';
import { GLASS } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';

interface Room {
  id: string;
  name: string;
  lastMessage?: string;
  lastAt?: string;
  unreadCount?: number;
}

interface Message {
  id: string;
  roomId: string;
  senderId: string;
  content: string;
  createdAt: string;
}

export default function MessagingPage() {
  const { user } = useAuth();
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: rooms, isLoading: roomsLoading, error: roomsError, refetch: refetchRooms } = useMessageRooms();
  const { data: messages, isLoading: msgsLoading } = useMessages(selectedRoomId ?? '');
  const { mutateAsync: sendMessage, isPending: isSending } = useSendMessage();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !selectedRoomId || isSending) return;
    const content = inputValue;
    setInputValue('');
    try {
      await sendMessage({ roomId: selectedRoomId, content });
    } catch {
      setInputValue(content);
    }
  };

  const roomList = (rooms as Room[] | undefined) ?? [];
  const messageList = (messages as Message[] | undefined) ?? [];
  const selectedRoom = roomList.find((r) => r.id === selectedRoomId);

  return (
    <div className={cn(GLASS.card, 'flex h-[calc(100vh-8rem)] overflow-hidden')}>
      {/* 채팅방 목록 */}
      <aside className="w-64 border-r border-border/50 flex flex-col flex-shrink-0" aria-label="채팅방 목록">
        <div className="p-4 border-b border-border/50">
          <h1 className="text-sm font-semibold text-foreground">메시지</h1>
        </div>

        {roomsLoading ? (
          <div className="p-4"><LoadingSkeleton rows={4} /></div>
        ) : roomsError ? (
          <ErrorMessage message="채팅방 목록을 불러오지 못했습니다." onRetry={() => refetchRooms()} />
        ) : !roomList.length ? (
          <EmptyState icon={MessageSquareIcon} message="채팅방이 없습니다." />
        ) : (
          <ul className="flex-1 overflow-y-auto" role="listbox" aria-label="채팅방 선택">
            {roomList.map((room) => (
              <li key={room.id} role="option" aria-selected={selectedRoomId === room.id}>
                <button
                  onClick={() => setSelectedRoomId(room.id)}
                  className={cn(
                    'w-full text-left px-4 py-3 hover:bg-accent transition-colors',
                    selectedRoomId === room.id && 'bg-primary/10',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <p className={cn('text-sm font-medium truncate', selectedRoomId === room.id && 'text-primary')}>
                      {room.name}
                    </p>
                    {(room.unreadCount ?? 0) > 0 && (
                      <span className="h-5 w-5 rounded-full bg-primary text-[10px] font-bold text-white flex items-center justify-center flex-shrink-0">
                        {room.unreadCount}
                      </span>
                    )}
                  </div>
                  {room.lastMessage && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{room.lastMessage}</p>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {/* 채팅창 */}
      <main className="flex-1 flex flex-col min-w-0" aria-label="채팅창">
        {!selectedRoomId ? (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState
              icon={MessageSquareIcon}
              title="채팅방을 선택하세요"
              message="왼쪽 목록에서 채팅방을 선택하면 대화를 시작할 수 있습니다."
            />
          </div>
        ) : (
          <>
            {/* 채팅방 헤더 */}
            <div className="px-4 py-3 border-b border-border/50 flex-shrink-0">
              <h2 className="text-sm font-semibold text-foreground">{selectedRoom?.name ?? '채팅방'}</h2>
            </div>

            {/* 메시지 목록 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3" role="log" aria-label="메시지 목록" aria-live="polite">
              {msgsLoading ? (
                <LoadingSkeleton rows={5} />
              ) : !messageList.length ? (
                <EmptyState message="아직 메시지가 없습니다. 첫 메시지를 보내보세요!" />
              ) : (
                messageList.map((msg) => {
                  const isMine = msg.senderId === user?.id;
                  return (
                    <div
                      key={msg.id}
                      className={cn('flex', isMine ? 'justify-end' : 'justify-start')}
                    >
                      <div
                        className={cn(
                          'max-w-[70%] rounded-2xl px-4 py-2 text-sm',
                          isMine
                            ? 'bg-primary text-primary-foreground rounded-br-sm'
                            : 'bg-muted text-foreground rounded-bl-sm',
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                        <p className={cn('text-xs mt-1', isMine ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                          {format(new Date(msg.createdAt), 'HH:mm', { locale: ko })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} aria-hidden="true" />
            </div>

            {/* 메시지 입력 */}
            <form
              onSubmit={handleSend}
              className="p-4 border-t border-border/50 flex gap-2 flex-shrink-0"
              aria-label="메시지 입력"
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="메시지를 입력하세요..."
                disabled={isSending}
                className="flex-1 rounded-full border border-input bg-background px-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label="메시지 내용"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isSending}
                className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="전송"
              >
                {isSending ? (
                  <LoaderIcon className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <SendIcon className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
