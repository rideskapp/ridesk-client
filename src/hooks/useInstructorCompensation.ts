//hook for calculating single lesson compensation

import { useQuery } from "@tanstack/react-query";
import { compensationApi } from "@/services/compensation";
import { useCompensationMode } from "./useCompensationMode";
import { useAuthStore } from "@/store/auth";
import { UserRole } from "@/types";
import { useSchoolSelectionStore } from "@/store/schoolSelection";

export const useInstructorCompensation = (
  instructorId: string | undefined,
  categoryId: string | undefined,
  durationHours: number | undefined,
) => {
  const { user } = useAuthStore();
  const { selectedSchoolId } = useSchoolSelectionStore();
  const { isEnabled: isCompensationEnabled } = useCompensationMode();
  
  const effectiveSchoolId =
    user?.role === UserRole.SUPER_ADMIN ? (selectedSchoolId ?? undefined) : user?.schoolId;
  
  const shouldFetch = user?.role === UserRole.INSTRUCTOR || isCompensationEnabled;

  const {
    data: compensation,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["lesson-compensation", instructorId, categoryId, durationHours, effectiveSchoolId],
    queryFn: () => {
      if (!instructorId || !categoryId || !durationHours || !effectiveSchoolId) {
        return Promise.resolve(null);
      }
      return compensationApi.calculateLessonCompensation(instructorId, categoryId, durationHours, effectiveSchoolId);
    },
    enabled: shouldFetch && !!instructorId && !!categoryId && !!durationHours && durationHours > 0 && !!effectiveSchoolId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    compensation: compensation ?? null,
    loading: isLoading,
    error,
  };
};

