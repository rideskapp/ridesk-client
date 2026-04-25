/**
 * @fileoverview User Role Hook
 * @description Hook to get current user's role and permissions
 * @author Ridesk Team
 * @version 1.0.0
 */

import { useAuthStore } from "../store/auth";
import { UserRole } from "../types/auth";

export const useUserRole = () => {
  const { user } = useAuthStore();

  // Debug user data
  console.log("useUserRole - User from store:", user);

  const role: UserRole = (user?.role as UserRole) || UserRole.USER;

  const permissions = {
    canManageInstructors: role === UserRole.SCHOOL_ADMIN || role === UserRole.SUPER_ADMIN,
    canManageStudents: role === UserRole.SCHOOL_ADMIN || role === UserRole.SUPER_ADMIN,
    canManageLessons: role === UserRole.SCHOOL_ADMIN || role === UserRole.SUPER_ADMIN || role === UserRole.INSTRUCTOR,
    canCreateLessons: role === UserRole.SCHOOL_ADMIN || role === UserRole.SUPER_ADMIN || role === UserRole.INSTRUCTOR,
    canViewReports: role === UserRole.SCHOOL_ADMIN || role === UserRole.SUPER_ADMIN,
    canCreateUsers: role === UserRole.SCHOOL_ADMIN || role === UserRole.SUPER_ADMIN,
    canInviteUsers: role === UserRole.SCHOOL_ADMIN || role === UserRole.SUPER_ADMIN,
    canViewStudents: role === UserRole.SCHOOL_ADMIN || role === UserRole.SUPER_ADMIN || role === UserRole.INSTRUCTOR,
    // Instructor-specific permissions
    canManageOwnAvailability: role === UserRole.INSTRUCTOR,
    canViewOwnLessons: role === UserRole.INSTRUCTOR,
    // Instructors require explicit school authorization for lesson edits.
    canEditLessons: role === UserRole.SCHOOL_ADMIN || role === UserRole.SUPER_ADMIN,
  };

  return {
    role,
    permissions,
    isSchoolAdmin: role === UserRole.SCHOOL_ADMIN,
    isInstructor: role === UserRole.INSTRUCTOR,
    isStudent: role === UserRole.USER,
    isSuperAdmin: role === UserRole.SUPER_ADMIN,
  };
};
