'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

const KEYS = {
  all: ['notifications'] as const,
};

export function useNotifications() {
  return useQuery({
    queryKey: KEYS.all,
    queryFn: async () => {
      const { data } = await apiClient.get('/api/notifications');
      return data?.data ?? [];
    },
    refetchInterval: 30000, // 30초 폴링
  });
}

export function useReadNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.put(`/api/notifications/${id}/read`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}
