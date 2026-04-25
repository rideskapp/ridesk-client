import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useErrorTranslation } from './useErrorTranslation';
import { api } from '@/lib/api';
import { toast } from 'react-hot-toast';

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  color: string;
  default_max_participants: number;
  active: boolean;
  is_active?: boolean; 
  sort_order?: number; 
  order_position?: number; 
  school_id?: string;
  associable_to_lessons?: boolean;
  created_at: string;
  updated_at: string;
}

export const useProductCategories = (schoolId?: string) => {
  const { t } = useTranslation();
  const { getTranslatedError } = useErrorTranslation();
  const queryClient = useQueryClient();

  const {
    data: categories = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['product-categories', schoolId],
    queryFn: async () => {
      const params = schoolId ? { schoolId } : {};
      const response = await api.get('/product-categories', { params });
      const cats = response.data.data as ProductCategory[];
      return cats.map(cat => ({
        ...cat,
        active: cat.is_active ?? cat.active ?? true,
        order_position: cat.sort_order ?? cat.order_position ?? 0,
      }));
    },
    enabled: schoolId !== undefined,
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<ProductCategory>) => {
      const payload = schoolId ? { ...data, school_id: schoolId } : data;
      const response = await api.post('/product-categories', payload);
      return response.data.data as ProductCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-categories'] });
      toast.success(t('productCategories.created'));
    },
    onError: (error: any) => {
      toast.error(getTranslatedError(error) || t('productCategories.createFailed'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ProductCategory> }) => {
      const response = await api.put(`/product-categories/${id}`, data);
      return response.data.data as ProductCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-categories'] });
      toast.success(t('productCategories.updated'));
    },
    onError: (error: any) => {
      toast.error(getTranslatedError(error) || t('productCategories.updateFailed'));
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.patch(`/product-categories/${id}/toggle-status`);
      return response.data.data as ProductCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-categories'] });
      toast.success(t('productCategories.statusUpdated'));
    },
    onError: (error: any) => {
      toast.error(getTranslatedError(error) || t('productCategories.statusUpdateFailed'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/product-categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-categories'] });
      toast.success(t('productCategories.deleted'));
    },
    onError: (error: any) => {
      toast.error(getTranslatedError(error) || t('productCategories.deleteFailed'));
    },
  });

  return {
    categories,
    isLoading,
    error,
    refetch,
    createCategory: createMutation.mutateAsync,
    updateCategory: updateMutation.mutateAsync,
    toggleStatus: toggleStatusMutation.mutateAsync,
    deleteCategory: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isToggling: toggleStatusMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};

