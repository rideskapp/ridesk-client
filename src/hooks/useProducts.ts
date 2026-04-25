import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useErrorTranslation } from './useErrorTranslation';
import { api } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '@/store/auth';
import { UserRole } from '@/types';

export interface Product {
  id: string;
  title: string;
  slug: string;
  category_id: string;
  discipline_id?: string;
  description_short?: string;
  price: number;
  price_type?: string;
  duration_hours?: number;
  max_participants: number;
  equipment_flag_discount?: boolean;
  note?: string;
  active: boolean;
  is_active?: boolean; 
  featured: boolean;
  is_featured?: boolean; 
  order_position: number;
  school_id?: string;
  created_at: string;
  updated_at: string;
  product_categories?: {
    id: string;
    name: string;
    color: string;
  };
  disciplines?: {
    id: string;
    display_name: string;
    color: string;
  };
}

export const useProducts = (filters?: { category_id?: string; discipline_id?: string; schoolId?: string }) => {
  const { t } = useTranslation();
  const { getTranslatedError } = useErrorTranslation();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  // for super admin, schoolid must be provided
  const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN;
  const hasSchoolId = isSuperAdmin ? filters?.schoolId !== undefined : true;

  const {
    data: products = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['products', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.category_id) params.append('category_id', filters.category_id);
      if (filters?.discipline_id) params.append('discipline_id', filters.discipline_id);
      if (filters?.schoolId) params.append('schoolId', filters.schoolId);
      
      const response = await api.get(`/products?${params.toString()}`);
      const prods = response.data.data as Product[];
      return prods.map(prod => ({
        ...prod,
        active: prod.is_active ?? prod.active ?? true,
        featured: prod.is_featured ?? prod.featured ?? false,
      }));
    },
    enabled: hasSchoolId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<Product>) => {
      const payload = filters?.schoolId ? { ...data, school_id: filters.schoolId } : data;
      const response = await api.post('/products', payload);
      return response.data.data as Product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(t('products.created'));
    },
    onError: (error: any) => {
      toast.error(getTranslatedError(error) || t('products.createFailed'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Product> }) => {
      const response = await api.put(`/products/${id}`, data);
      return response.data.data as Product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(t('products.updated'));
    },
    onError: (error: any) => {
      toast.error(getTranslatedError(error) || t('products.updateFailed'));
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.patch(`/products/${id}/toggle-status`);
      return response.data.data as Product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(t('products.statusUpdated'));
    },
    onError: (error: any) => {
      toast.error(getTranslatedError(error) || t('products.statusUpdateFailed'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(t('products.deleted'));
    },
    onError: (error: any) => {
      toast.error(getTranslatedError(error) || t('products.deleteFailed'));
    },
  });

  return {
    products,
    isLoading,
    error,
    refetch,
    createProduct: createMutation.mutateAsync,
    updateProduct: updateMutation.mutateAsync,
    toggleStatus: toggleStatusMutation.mutateAsync,
    deleteProduct: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isToggling: toggleStatusMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};

