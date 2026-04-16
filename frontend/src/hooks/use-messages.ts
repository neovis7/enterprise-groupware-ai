'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { CreateMessage } from '@/types/api-contracts';

const KEYS = {
  rooms: ['message-rooms'] as const,
  messages: (roomId: string) => ['messages', roomId] as const,
};

export function useMessageRooms() {
  return useQuery({
    queryKey: KEYS.rooms,
    queryFn: async () => {
      const { data } = await apiClient.get('/api/messages/rooms');
      return data?.data ?? [];
    },
  });
}

export function useMessages(roomId: string) {
  return useQuery({
    queryKey: KEYS.messages(roomId),
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/messages/${roomId}`);
      return data?.data ?? [];
    },
    enabled: Boolean(roomId),
    refetchInterval: 5000, // 5초마다 폴링 (WebSocket 미구현 시 대체)
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateMessage) => {
      const { data } = await apiClient.post('/api/messages', payload);
      return data?.data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: KEYS.messages(variables.roomId) });
    },
  });
}
