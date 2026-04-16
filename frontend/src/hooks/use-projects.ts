'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

interface CreateProject {
  name: string;
  memberIds: string[];
}

interface CreateTask {
  title: string;
  assigneeId: string;
  dueDate: string;
  priority?: 'low' | 'medium' | 'high';
}

interface UpdateTask {
  id: string;
  status?: 'todo' | 'in_progress' | 'done';
  title?: string;
  assigneeId?: string;
  dueDate?: string;
}

const KEYS = {
  all: ['projects'] as const,
  detail: (id: string) => ['projects', id] as const,
  tasks: (projectId: string) => ['projects', projectId, 'tasks'] as const,
};

export function useProjects() {
  return useQuery({
    queryKey: KEYS.all,
    queryFn: async () => {
      const { data } = await apiClient.get('/api/projects');
      return data?.data ?? [];
    },
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/projects/${id}`);
      return data?.data ?? null;
    },
    enabled: Boolean(id),
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateProject) => {
      const { data } = await apiClient.post('/api/projects', payload);
      return data?.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
  });
}

export function useTasks(projectId: string) {
  return useQuery({
    queryKey: KEYS.tasks(projectId),
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/projects/${projectId}/tasks`);
      return data?.data ?? [];
    },
    enabled: Boolean(projectId),
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, ...payload }: CreateTask & { projectId: string }) => {
      const { data } = await apiClient.post(`/api/projects/${projectId}/tasks`, payload);
      return data?.data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: KEYS.tasks(variables.projectId) });
      qc.invalidateQueries({ queryKey: KEYS.detail(variables.projectId) });
    },
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateTask) => {
      const { data } = await apiClient.put(`/api/tasks/${id}`, payload);
      return data?.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}
