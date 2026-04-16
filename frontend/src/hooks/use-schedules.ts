'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { CreateSchedule } from '@/types/api-contracts';

const KEYS = {
  all: ['schedules'] as const,
  list: (year: number, month: number) => ['schedules', year, month] as const,
  detail: (id: string) => ['schedules', id] as const,
};

export function useSchedules(year: number, month: number) {
  return useQuery({
    queryKey: KEYS.list(year, month),
    queryFn: async () => {
      const { data } = await apiClient.get('/api/schedules/', { params: { year, month } });
      return data?.data ?? [];
    },
  });
}

export function useSchedule(id: string) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/schedules/${id}`);
      return data?.data ?? null;
    },
    enabled: Boolean(id),
  });
}

export function useCreateSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateSchedule) => {
      const { data } = await apiClient.post('/api/schedules/', payload);
      return data?.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

export function useUpdateSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<CreateSchedule> & { id: string }) => {
      const { data } = await apiClient.put(`/api/schedules/${id}`, payload);
      return data?.data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: KEYS.detail(variables.id) });
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

export function useDeleteSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/schedules/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

export function useRespondSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, response }: { id: string; response: 'accept' | 'decline' }) => {
      const { data } = await apiClient.put(`/api/schedules/${id}/respond`, { response });
      return data?.data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: KEYS.detail(variables.id) });
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}
