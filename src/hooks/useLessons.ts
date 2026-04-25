import { useQuery } from '@tanstack/react-query';
import { lessonsApi, LessonDetails } from '@/services/lessons';
import { useAuthStore } from '@/store/auth';
import { UserRole } from '@/types';

export const useLessons = (params?: {
  startDate?: string;
  endDate?: string;
  instructorId?: string;
  discipline?: string;
  schoolId?: string;
}) => {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN;
  const hasSchoolId = isSuperAdmin ? params?.schoolId !== undefined : true;

  const {
    data: lessons,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['lessons', params],
    queryFn: () => {
      const today = new Date();
      const startDate = params?.startDate || today.toISOString().split('T')[0];
      const endDate = params?.endDate || new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      return lessonsApi.listByRange({
        startDate,
        endDate,
        instructorId: params?.instructorId,
        discipline: params?.discipline,
        schoolId: params?.schoolId,
      });
    },
    enabled: hasSchoolId,
  });

  return {
    lessons: lessons || [],
    loading: isLoading,
    error,
    refetch,
  };
};

export const useLessonDetails = (id: string | undefined) => {
  const {
    data: lesson,
    isLoading,
    error,
    refetch
  } = useQuery<LessonDetails>({
    queryKey: ['lesson', id],
    queryFn: () => lessonsApi.getById(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    lesson,
    isLoading,
    error,
    refetch,
  };
};



