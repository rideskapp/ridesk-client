import { useQuery } from "@tanstack/react-query";
import { schoolSettingsApi, SchoolSettings } from "@/services/schoolSettings";
import { useAuthStore } from "@/store/auth";

export const useSchoolSettings = (schoolId?: string) => {
  const { user } = useAuthStore();
  const targetSchoolId = schoolId || user?.schoolId;

  const {
    data: settings,
    isLoading,
    error,
    refetch
  } = useQuery<SchoolSettings>({
    queryKey: ["school-settings", targetSchoolId],
    queryFn: () => schoolSettingsApi.getBySchoolId(targetSchoolId!),
    enabled: !!targetSchoolId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    settings,
    isLoading,
    error,
    refetch,
  };
};

