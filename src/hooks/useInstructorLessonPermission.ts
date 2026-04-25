import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import { useSchoolSelectionStore } from "@/store/schoolSelection";
import { UserRole } from "@/types";
import { instructorLessonPermissionsApi } from "@/services/instructorLessonPermissions";

export const useInstructorLessonPermission = (overrideSchoolId?: string) => {
  const { user } = useAuthStore();
  const { selectedSchoolId } = useSchoolSelectionStore();
  const schoolId =
    user?.role === UserRole.SUPER_ADMIN
      ? overrideSchoolId || selectedSchoolId || undefined
      : overrideSchoolId || selectedSchoolId || user?.schoolId;
  const isInstructor = user?.role === UserRole.INSTRUCTOR;

  const query = useQuery({
    queryKey: ["instructor-lesson-permission", user?.id, schoolId],
    queryFn: () => instructorLessonPermissionsApi.getMyPermission(schoolId),
    enabled: isInstructor,
    staleTime: 60000,
  });

  return {
    canEditLessons: isInstructor
      ? Boolean(query.data?.canEditLessons)
      : true,
    isLoading: query.isLoading,
  };
};
