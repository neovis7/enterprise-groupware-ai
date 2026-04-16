'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { CreateUser } from '@/types/api-contracts';

const KEYS = {
  all: ['users'] as const,
  detail: (id: string) => ['users', id] as const,
};

export function useUsers() {
  return useQuery({
    queryKey: KEYS.all,
    queryFn: async () => {
      const { data } = await apiClient.get('/api/users');
      return data?.data ?? [];
    },
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/users/${id}`);
      return data?.data ?? null;
    },
    enabled: Boolean(id),
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateUser) => {
      const { data } = await apiClient.post('/api/users', payload);
      return data?.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<CreateUser> & { id: string }) => {
      const { data } = await apiClient.put(`/api/users/${id}`, payload);
      return data?.data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: KEYS.detail(variables.id) });
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/users/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}
