import { useSchoolSettings } from './useSchoolSettings';
import { useAuthStore } from '@/store/auth';
import { useSchoolSelectionStore } from '@/store/schoolSelection';
import { UserRole, ALL_SCHOOLS_ID } from '@/types';

export const useCompensationMode = () => {
  const { user } = useAuthStore();
  const { selectedSchoolId, instructorSelectedSchoolId } = useSchoolSelectionStore();
  
  const effectiveSchoolId = user?.role === UserRole.SUPER_ADMIN
    ? (selectedSchoolId ?? undefined)
    : (user?.role === UserRole.INSTRUCTOR 
        ? (instructorSelectedSchoolId === ALL_SCHOOLS_ID ? user?.schoolId : (instructorSelectedSchoolId || user?.schoolId))
        : user?.schoolId);
  
  const { settings, isLoading } = useSchoolSettings(effectiveSchoolId);

  if (user?.role === UserRole.INSTRUCTOR) {
    return {
      isEnabled: true,
      compensationMode: settings?.compensationMode || 'fixed',
      isLoading,
      shouldAccumulateTotals: settings?.compensationMode === 'variable', // But totals only accumulate in variable mode
    };
  }

  const isEnabled = settings?.compensationMode === 'variable';
  
  return {
    isEnabled,
    compensationMode: settings?.compensationMode || 'fixed',
    isLoading,
    shouldAccumulateTotals: isEnabled,
  };
};

