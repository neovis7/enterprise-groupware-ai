'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { CreateDepartment } from '@/types/api-contracts';

const KEYS = {
  all: ['departments'] as const,
  detail: (id: string) => ['departments', id] as const,
};

export function useDepartments() {
  return useQuery({
    queryKey: KEYS.all,
    queryFn: async () => {
      const { data } = await apiClient.get('/api/departments/');
      return data?.data ?? [];
    },
  });
}

export function useCreateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateDepartment) => {
      const { data } = await apiClient.post('/api/departments/', payload);
      return data?.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

export function useUpdateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<CreateDepartment> & { id: string }) => {
      const { data } = await apiClient.put(`/api/departments/${id}`, payload);
      return data?.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

export function useDeleteDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/departments/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}
