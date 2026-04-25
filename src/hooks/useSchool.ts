import { useQuery } from '@tanstack/react-query';
import { schoolsApi, School } from '@/services/schools';
import { useAuthStore } from '@/store/auth';

export const useSchool = (schoolId?: string) => {
  const { user } = useAuthStore();
  const targetSchoolId = schoolId || user?.schoolId;

  const {
    data: school,
    isLoading,
    error,
    refetch
  } = useQuery<School>({
    queryKey: ['school', targetSchoolId],
    queryFn: () => schoolsApi.getById(targetSchoolId!),
    enabled: !!targetSchoolId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    school,
    isLoading,
    error,
    refetch,
  };
};

