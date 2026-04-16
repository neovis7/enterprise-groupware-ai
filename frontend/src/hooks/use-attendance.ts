'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

interface CreateLeave {
  type: 'annual' | 'sick' | 'special';
  startDate: string;
  endDate: string;
  reason: string;
}

const KEYS = {
  attendance: (year: number, month: number) => ['attendance', year, month] as const,
  leaves: ['leaves'] as const,
};

export function useAttendance(year: number, month: number) {
  return useQuery({
    queryKey: KEYS.attendance(year, month),
    queryFn: async () => {
      const { data } = await apiClient.get('/api/attendance', { params: { year, month } });
      return data?.data ?? [];
    },
  });
}

export function useCheckin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post('/api/attendance/checkin');
      return data?.data;
    },
    onSuccess: () => {
      const now = new Date();
      qc.invalidateQueries({ queryKey: KEYS.attendance(now.getFullYear(), now.getMonth() + 1) });
    },
  });
}

export function useCheckout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post('/api/attendance/checkout');
      return data?.data;
    },
    onSuccess: () => {
      const now = new Date();
      qc.invalidateQueries({ queryKey: KEYS.attendance(now.getFullYear(), now.getMonth() + 1) });
    },
  });
}

export function useLeaves() {
  return useQuery({
    queryKey: KEYS.leaves,
    queryFn: async () => {
      const { data } = await apiClient.get('/api/leaves');
      return data?.data ?? [];
    },
  });
}

export function useCreateLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateLeave) => {
      const { data } = await apiClient.post('/api/leaves', payload);
      return data?.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.leaves });
    },
  });
}
