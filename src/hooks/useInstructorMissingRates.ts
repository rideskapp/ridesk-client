// Hook for getting missing rates count for an instructor
import { useQuery } from "@tanstack/react-query";
import { compensationApi } from "@/services/compensation";
import { useAuthStore } from "@/store/auth";
import { useSchoolSelectionStore } from "@/store/schoolSelection";
import { UserRole } from "@/types";

export const useInstructorMissingRates = (
  instructorId: string | undefined,
  schoolId?: string,
  enabled: boolean = true,
) => {
  const { user } = useAuthStore();
  const { selectedSchoolId } = useSchoolSelectionStore();

  const effectiveSchoolId =
    user?.role === UserRole.SUPER_ADMIN
      ? schoolId || selectedSchoolId || undefined
      : user?.schoolId || schoolId;

  const {
    data: missingCount,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["instructor-missing-rates", instructorId, effectiveSchoolId],
    queryFn: () => {
      if (!instructorId || !effectiveSchoolId) {
        return Promise.resolve(0);
      }
      return compensationApi.getInstructorMissingRatesCount(instructorId, effectiveSchoolId);
    },
    enabled: enabled && !!instructorId && !!effectiveSchoolId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  return {
    missingCount: missingCount ?? 0,
    loading: isLoading,
    error,
    refetch,
  };
};

