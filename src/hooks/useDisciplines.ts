import { useQuery } from '@tanstack/react-query';
import { disciplinesApi, type Discipline } from '@/services/disciplines';

export const useDisciplines = (schoolId?: string) => {
  const {
    data: disciplines = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['disciplines', schoolId],
    queryFn: () => disciplinesApi.getActiveDisciplines(schoolId),
    enabled: schoolId !== undefined,
    staleTime: Infinity, 
    gcTime: 30 * 60 * 1000, 
    refetchOnMount: false, 
    refetchOnWindowFocus: false, 
    refetchOnReconnect: false,
    retry: false, 
    throwOnError: false, 
  });

  const getDisciplineById = (id: string): Discipline | undefined => {
    return disciplines.find(d => d.id === id);
  };

  const getDisciplineBySlug = (slug: string): Discipline | undefined => {
    return disciplines.find(d => d.slug === slug);
  };

  const getActiveDisciplines = (): Discipline[] => {
    return disciplines; // All disciplines from API are already active
  };

  // Create color map from disciplines
  const colorMap = disciplines.reduce((acc, discipline) => {
    if (discipline.slug && discipline.color) {
      acc[discipline.slug] = discipline.color;
    }
    return acc;
  }, {} as Record<string, string>);

  return {
    disciplines,
    isLoading,
    error,
    refetch,
    getDisciplineById,
    getDisciplineBySlug,
    getActiveDisciplines,
    colorMap,
  };
};

export const useAllDisciplines = (schoolId?: string) => {
  const {
    data: disciplines = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['disciplines', 'all', schoolId],
    queryFn: () => disciplinesApi.getAllDisciplines(schoolId),
    staleTime: Infinity, 
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  return { disciplines, isLoading, error, refetch };
};

export type { Discipline };
