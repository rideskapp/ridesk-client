/**
 * @fileoverview Role-Aware API Service
 * @description API service that makes appropriate calls based on user role
 * @author Ridesk Team
 * @version 1.0.0
 */

import { api } from "../lib/api";
import { UserRole } from "../types/auth";

export interface RoleAwareInstructorsResponse {
  instructors: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface RoleAwareStudentsResponse {
  students: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Role-aware API service that makes appropriate calls based on user role
 */
export const roleAwareApi = {
  /**
   * Get instructors based on user role
   * - SCHOOL_ADMIN: Uses /api/instructors (full management)
   * - INSTRUCTOR: Uses /api/instructor/colleagues (colleagues only)
   * - USER: Uses /api/student/instructors (instructors they've had lessons with)
   */
  async getInstructors(
    userRole: UserRole,
    page: number = 1,
    limit: number = 10,
    search: string = "",
  ): Promise<RoleAwareInstructorsResponse> {
    try {
      let endpoint: string;

      switch (userRole) {
        case "SCHOOL_ADMIN":
          endpoint = `/instructors?page=${page}&limit=${limit}${
            search ? `&search=${search}` : ""
          }`;
          break;
        case "INSTRUCTOR":
          endpoint = `/instructor/school-instructors?page=${page}&limit=${limit}`;
          break;
        case "USER":
          endpoint = `/student/instructors?page=${page}&limit=${limit}`;
          break;
        default:
          throw new Error(`Unsupported role: ${userRole}`);
      }

      console.log("Making API call to:", endpoint);
      const response = await api.get(endpoint);
      console.log("API response:", response.data);
      return response.data.data;
    } catch (error: any) {
      console.error("API error:", error);
      throw new Error(
        error.response?.data?.message || "Failed to fetch instructors",
      );
    }
  },

  /**
   * Get students based on user role
   * - SCHOOL_ADMIN: Uses /api/students (full management)
   * - INSTRUCTOR: Uses /api/instructor/students (students they've taught)
   * - USER: Not applicable (students don't manage other students)
   */
  async getStudents(
    userRole: UserRole,
    page: number = 1,
    limit: number = 10,
    search: string = "",
  ): Promise<RoleAwareStudentsResponse> {
    try {
      let endpoint: string;

      switch (userRole) {
        case "SCHOOL_ADMIN":
          endpoint = `/students?page=${page}&limit=${limit}${
            search ? `&search=${search}` : ""
          }`;
          break;
        case "INSTRUCTOR":
          endpoint = `/instructor/school-students?page=${page}&limit=${limit}`;
          break;
        case "USER":
          throw new Error("Students cannot access student management");
        default:
          throw new Error(`Unsupported role: ${userRole}`);
      }

      console.log("Making API call to:", endpoint);
      const response = await api.get(endpoint);
      console.log("API response:", response.data);
      return response.data.data;
    } catch (error: any) {
      console.error("API error:", error);
      const backendMessage = error?.response?.data?.message || error?.response?.data?.error;
      if (error?.response?.status === 403) {
        const message = backendMessage || "User not associated with any school. Please create your school first.";
        throw new Error(message);
      }
      throw new Error(backendMessage || "Failed to fetch students");
    }
  },

  /**
   * Get user's own profile based on role
   */
  async getProfile(userRole: UserRole): Promise<any> {
    try {
      let endpoint: string;

      switch (userRole) {
        case "INSTRUCTOR":
          endpoint = `/instructor/profile`;
          break;
        case "USER":
          endpoint = `/student/profile`;
          break;
        case "SCHOOL_ADMIN":
          // School admins might use a different endpoint or the same as instructors
          endpoint = `/instructor/profile`;
          break;
        default:
          throw new Error(`Unsupported role: ${userRole}`);
      }

      const response = await api.get(endpoint);
      return response.data.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Failed to fetch profile",
      );
    }
  },

  /**
   * Check if user can manage instructors
   */
  canManageInstructors(userRole: UserRole): boolean {
    return userRole === "SCHOOL_ADMIN";
  },

  /**
   * Check if user can manage students
   */
  canManageStudents(userRole: UserRole): boolean {
    return userRole === "SCHOOL_ADMIN";
  },

  /**
   * Check if user can manage lessons
   */
  canManageLessons(userRole: UserRole): boolean {
    return userRole === "SCHOOL_ADMIN" || userRole === "INSTRUCTOR";
  },

  /**
   * Check if user can view reports
   */
  canViewReports(userRole: UserRole): boolean {
    return userRole === "SCHOOL_ADMIN";
  },
};
