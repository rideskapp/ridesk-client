import { useQuery } from '@tanstack/react-query';
import { systemConfigApi, type SystemConfig } from '@/services/systemConfig';

export const useSystemConfig = () => {
  const {
    data: config,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['systemConfig'],
    queryFn: () => systemConfigApi.getSystemConfig(),
    staleTime: 5 * 60 * 1000, 
    gcTime: 30 * 60 * 1000, 
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  return {
    config: config || null,
    isLoading,
    error,
    refetch,
  };
};

export type { SystemConfig };

