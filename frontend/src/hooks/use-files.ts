'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

const KEYS = {
  folders: ['folders'] as const,
  files: (folderId?: string) => ['files', folderId] as const,
};

export function useFolders() {
  return useQuery({
    queryKey: KEYS.folders,
    queryFn: async () => {
      const { data } = await apiClient.get('/api/folders');
      return data?.data ?? [];
    },
  });
}

export function useFiles(folderId?: string) {
  return useQuery({
    queryKey: KEYS.files(folderId),
    queryFn: async () => {
      const { data } = await apiClient.get('/api/files', {
        params: folderId ? { folderId } : undefined,
      });
      return data?.data ?? [];
    },
  });
}

export function useUploadFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, folderId }: { file: File; folderId?: string }) => {
      const formData = new FormData();
      formData.append('file', file);
      if (folderId) formData.append('folderId', folderId);

      const { data } = await apiClient.post('/api/files', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data?.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['files'] });
    },
  });
}

export function useDeleteFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/files/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['files'] });
    },
  });
}
