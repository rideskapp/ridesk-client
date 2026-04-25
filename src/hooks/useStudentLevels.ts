import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useErrorTranslation } from './useErrorTranslation';
import { api } from '@/lib/api';
import { toast } from 'react-hot-toast';

export interface StudentLevel {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color: string;
  active: boolean;
  is_active?: boolean; 
  school_id?: string;
  created_at: string;
  updated_at: string;
}

export const useStudentLevels = (schoolId?: string) => {
  const { t } = useTranslation();
  const { getTranslatedError } = useErrorTranslation();
  const queryClient = useQueryClient();

  const {
    data: studentLevels = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['student-levels', schoolId],
    queryFn: async () => {
      const params = schoolId ? { schoolId } : {};
      const response = await api.get('/student-levels', { params });
      const levels = response.data.data as StudentLevel[];
      return levels.map(level => ({
        ...level,
        active: level.is_active ?? level.active ?? true,
      }));
    },
    enabled: schoolId !== undefined,
    retry: false, 
    throwOnError: false, 
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<StudentLevel>) => {
      const payload = schoolId ? { ...data, school_id: schoolId } : data;
      const response = await api.post('/student-levels', payload);
      return response.data.data as StudentLevel;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-levels'] });
      toast.success(t('studentLevels.created'));
    },
    onError: (error: any) => {
      toast.error(getTranslatedError(error) || t('studentLevels.createFailed'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<StudentLevel> }) => {
      const response = await api.put(`/student-levels/${id}`, data);
      return response.data.data as StudentLevel;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-levels'] });
      toast.success(t('studentLevels.updated'));
    },
    onError: (error: any) => {
      toast.error(getTranslatedError(error) || t('studentLevels.updateFailed'));
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.patch(`/student-levels/${id}/toggle-status`);
      return response.data.data as StudentLevel;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-levels'] });
      toast.success(t('studentLevels.statusUpdated'));
    },
    onError: (error: any) => {
      toast.error(getTranslatedError(error) || t('studentLevels.statusUpdateFailed'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/student-levels/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-levels'] });
      toast.success(t('studentLevels.deleted'));
    },
    onError: (error: any) => {
      toast.error(getTranslatedError(error) || t('studentLevels.deleteFailed'));
    },
  });

  return {
    studentLevels,
    isLoading,
    error,
    refetch,
    createLevel: createMutation.mutateAsync,
    updateLevel: updateMutation.mutateAsync,
    toggleStatus: toggleStatusMutation.mutateAsync,
    deleteLevel: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isToggling: toggleStatusMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};

