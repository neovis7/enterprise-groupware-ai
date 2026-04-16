'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { CreateApproval, ProcessApproval } from '@/types/api-contracts';

const KEYS = {
  all: ['approvals'] as const,
  mine: () => [...KEYS.all, 'mine'] as const,
  pending: () => [...KEYS.all, 'pending'] as const,
  detail: (id: string) => [...KEYS.all, id] as const,
};

export function useApprovals(params?: { status?: 'mine' | 'pending'; assignee?: 'me' }) {
  return useQuery({
    queryKey: params?.status === 'pending' ? KEYS.pending() : KEYS.mine(),
    queryFn: async () => {
      const { data } = await apiClient.get('/api/approvals/', { params });
      return data?.data ?? [];
    },
  });
}

export function useApproval(id: string) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/approvals/${id}`);
      return data?.data ?? null;
    },
    enabled: Boolean(id),
  });
}

export function useCreateApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateApproval) => {
      const { data } = await apiClient.post('/api/approvals/', payload);
      return data?.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

export function useProcessApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action, comment }: ProcessApproval) => {
      const { data } = await apiClient.put(`/api/approvals/${id}/process`, { action, comment });
      return data?.data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: KEYS.detail(variables.id) });
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}
