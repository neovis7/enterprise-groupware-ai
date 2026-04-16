'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { CreatePost } from '@/types/api-contracts';

const KEYS = {
  all: ['posts'] as const,
  list: (params?: Record<string, unknown>) => ['posts', 'list', params] as const,
  detail: (id: string) => ['posts', id] as const,
};

export function usePosts(params?: { type?: string; page?: number }) {
  return useQuery({
    queryKey: KEYS.list(params),
    queryFn: async () => {
      const { data } = await apiClient.get('/api/posts', { params });
      return data?.data ?? [];
    },
  });
}

export function usePost(id: string) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/posts/${id}`);
      return data?.data ?? null;
    },
    enabled: Boolean(id),
  });
}

export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreatePost) => {
      const { data } = await apiClient.post('/api/posts', payload);
      return data?.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

export function useUpdatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<CreatePost> & { id: string }) => {
      const { data } = await apiClient.put(`/api/posts/${id}`, payload);
      return data?.data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: KEYS.detail(variables.id) });
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

export function useDeletePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/posts/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

export function useReadPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.put(`/api/posts/${id}/read`);
    },
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: KEYS.detail(id) });
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}
